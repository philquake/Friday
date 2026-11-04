import { useState, useRef, useCallback, useEffect } from 'react'
import { isElectron, startServerListener } from '../core/serverListener'
import type { ServerListener } from '../core/serverListener'

export type VoiceStatus = 'idle' | 'listening' | 'error'

interface UseVoiceInputReturn {
  isSupported: boolean
  status: VoiceStatus
  interimTranscript: string
  finalTranscript: string
  error: string | null
  setInputMuted: (muted: boolean) => void
  startListening: (lang?: string, autoRestart?: boolean) => void
  stopListening: () => string
  cancelAutoRestart: () => void
  resetTranscript: () => void
}

const RESTART_DEBOUNCE = 300
const UNMUTE_DELAY = 800

export function useVoiceInput(): UseVoiceInputReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const finalRef = useRef('')
  const autoRestartRef = useRef(false)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const langRef = useRef('en-US')

  // Electron has no Google speech keys, so Web Speech fails with a "network" error.
  // In that case (or on any "network" error) record the mic and transcribe on the backend.
  const useServerRef = useRef(isElectron())
  const serverListenerRef = useRef<ServerListener | null>(null)
  const serverTokenRef = useRef(0)

  const mutedRef = useRef(false)
  const unmuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mute the mic while Friday speaks so her own voice isn't transcribed and re-sent.
  // Unmuting is delayed a little to let the room echo die down.
  const setInputMuted = useCallback((muted: boolean) => {
    if (unmuteTimerRef.current) {
      clearTimeout(unmuteTimerRef.current)
      unmuteTimerRef.current = null
    }
    if (muted) {
      mutedRef.current = true
      serverListenerRef.current?.setMuted(true)
    } else {
      unmuteTimerRef.current = setTimeout(() => {
        mutedRef.current = false
        serverListenerRef.current?.setMuted(false)
      }, UNMUTE_DELAY)
    }
  }, [])

  const stopServer = useCallback(() => {
    serverTokenRef.current++
    serverListenerRef.current?.stop()
    serverListenerRef.current = null
  }, [])

  const isSupported =
    typeof window !== 'undefined' &&
    (useServerRef.current ||
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window)

  const resetTranscript = useCallback(() => {
    setInterimTranscript('')
    setFinalTranscript('')
    finalRef.current = ''
    setError(null)
  }, [])

  const cancelAutoRestart = useCallback(() => {
    autoRestartRef.current = false
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  const startServerMode = useCallback(() => {
    stopServer()
    const token = serverTokenRef.current
    const live = () => token === serverTokenRef.current
    setStatus('listening')
    setError(null)
    finalRef.current = ''
    setFinalTranscript('')
    setInterimTranscript('')

    startServerListener({
      onSpeechStart: () => { if (live()) setInterimTranscript('…') },
      onTranscript: (text) => {
        if (!live()) return
        setInterimTranscript('')
        if (!text) return // nothing intelligible; keep listening
        finalRef.current = text
        setFinalTranscript(text)
        setStatus('idle')
        if (autoRestartRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (autoRestartRef.current && live()) {
              finalRef.current = ''
              setFinalTranscript('')
              setStatus('listening')
            }
          }, RESTART_DEBOUNCE)
        } else {
          stopServer()
        }
      },
      onError: (msg) => {
        if (!live()) return
        setStatus('error')
        setError(msg)
        stopServer()
      },
      // One failed transcription (e.g. the model still loading) must not end hands-free listening.
      onTranscribeError: (msg) => {
        if (live()) setError(msg)
      },
    })
      .then((listener) => {
        if (live()) {
          serverListenerRef.current = listener
          listener.setMuted(mutedRef.current)
        } else listener.stop()
      })
      .catch((e) => {
        if (!live()) return
        setStatus('error')
        setError(e?.message || 'Microphone unavailable')
      })
  }, [stopServer])

  const startListening = useCallback((lang?: string, autoRestart?: boolean) => {
    if (!isSupported) {
      setError('Speech recognition not supported')
      return
    }

    cancelAutoRestart()
    autoRestartRef.current = autoRestart ?? false

    if (useServerRef.current) {
      startServerMode()
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }

    langRef.current = lang || 'en-US'

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = langRef.current

    // An aborted/replaced recognizer still fires onerror/onend later; ignore those stale events,
    // otherwise they flip status to idle and trigger restarts that kill the live session.
    const isStale = () => recognitionRef.current !== recognition

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalRef.current += transcript
          setFinalTranscript(finalRef.current)
        } else {
          interim += transcript
        }
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: any) => {
      if (isStale()) return
      if (event.error === 'network' || event.error === 'service-not-allowed') {
        useServerRef.current = true
        recognitionRef.current = null
        startServerMode()
        return
      }
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setStatus('idle')
        if (autoRestartRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (autoRestartRef.current) {
              startListening(langRef.current, true)
            }
          }, RESTART_DEBOUNCE)
        }
      } else {
        setStatus('error')
        setError(event.error)
      }
    }

    recognition.onend = () => {
      if (isStale()) return
      setStatus('idle')
      setInterimTranscript('')
      if (autoRestartRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (autoRestartRef.current) {
            startListening(langRef.current, true)
          }
        }, RESTART_DEBOUNCE)
      }
    }

    recognitionRef.current = recognition
    setStatus('listening')
    setError(null)
    finalRef.current = ''
    setFinalTranscript('')
    setInterimTranscript('')

    try {
      recognition.start()
    } catch {
      setStatus('error')
      setError('Failed to start recognition')
    }
  }, [isSupported, cancelAutoRestart, startServerMode])

  const stopListening = useCallback((): string => {
    autoRestartRef.current = false
    stopServer()
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    setStatus('idle')
    return finalRef.current
  }, [stopServer])

  useEffect(() => {
    return () => {
      autoRestartRef.current = false
      stopServer()
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, [stopServer])

  return { isSupported, status, interimTranscript, finalTranscript, error, setInputMuted, startListening, stopListening, cancelAutoRestart, resetTranscript }
}