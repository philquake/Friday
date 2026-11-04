import { useState, useRef, useCallback, useEffect } from 'react'
import { isElectron, startServerListener } from '../core/serverListener'
import type { ServerListener } from '../core/serverListener'
import { matchWake } from '../core/wakeWord'

interface UseWakeWordReturn {
  isSupported: boolean
  active: boolean
  listening: boolean
  error: string | null
  start: () => void
  stop: () => void
  /** Pause detection (e.g. while a conversation is already running or Friday is speaking). */
  setPaused: (paused: boolean) => void
}

const COOLDOWN_MS = 5000
const SESSION_RENEW_INTERVAL = 40000

/**
 * `onWake` receives anything said after "Hey Friday" in the same breath (may be empty).
 * In Electron the browser speech service doesn't exist, so the wake phrase is detected by
 * transcribing the microphone locally on the backend (Whisper), the same path push-to-talk uses.
 */
export function useWakeWord(onWake: (command?: string) => void): UseWakeWordReturn {
  const [active, setActive] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const cooldownRef = useRef(0)
  const activeRef = useRef(false)
  const sessionGenRef = useRef(0)
  const renewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onWakeRef = useRef(onWake)
  onWakeRef.current = onWake

  const useServerRef = useRef(isElectron())
  const serverRef = useRef<ServerListener | null>(null)
  const pausedRef = useRef(false)

  const isSupported =
    typeof window !== 'undefined' &&
    (useServerRef.current || 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const fireWake = useCallback((spoken: string) => {
    const now = Date.now()
    if (now - cooldownRef.current < COOLDOWN_MS) return false
    const { matched, command } = matchWake(spoken)
    if (!matched) return false
    cooldownRef.current = now
    onWakeRef.current(command || undefined)
    return true
  }, [])

  const stop = useCallback(() => {
    sessionGenRef.current += 1 // invalidate any in-flight start
    if (renewIntervalRef.current) {
      clearInterval(renewIntervalRef.current)
      renewIntervalRef.current = null
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }
    serverRef.current?.stop()
    serverRef.current = null
    activeRef.current = false
    setActive(false)
    setListening(false)
  }, [])

  const startServerSession = useCallback(() => {
    const gen = sessionGenRef.current
    const live = () => activeRef.current && gen === sessionGenRef.current
    startServerListener({
      onSpeechStart: () => {},
      onTranscript: (text) => { if (live() && text) fireWake(text) },
      onTranscribeError: (msg) => { if (live()) setError(msg) }, // keep listening
      onError: (msg) => {
        if (!live()) return
        setError(msg)
        stop()
      },
    })
      .then((listener) => {
        if (!live()) { listener.stop(); return }
        serverRef.current = listener
        listener.setMuted(pausedRef.current)
        setListening(true)
      })
      .catch((e) => {
        if (!live()) return
        setError(e?.message || 'Microphone unavailable')
        stop()
      })
  }, [fireWake, stop])

  const startSession = useCallback(() => {
    if (!activeRef.current) return

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    const gen = sessionGenRef.current

    recognition.onresult = (event: any) => {
      if (pausedRef.current) return
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (fireWake(event.results[i][0].transcript)) break
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'network' || event.error === 'service-not-allowed') {
        // The browser speech service is unavailable here: switch to local transcription.
        useServerRef.current = true
        if (renewIntervalRef.current) {
          clearInterval(renewIntervalRef.current)
          renewIntervalRef.current = null
        }
        recognitionRef.current = null
        if (activeRef.current && gen === sessionGenRef.current) startServerSession()
        return
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error)
      }
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
      if (activeRef.current && gen === sessionGenRef.current && !useServerRef.current) {
        startSession()
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setListening(true)
    } catch {
      setError('Failed to start wake word detection')
      setActive(false)
      setListening(false)
      activeRef.current = false
    }
  }, [fireWake, startServerSession])

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported')
      return
    }

    stop()
    activeRef.current = true
    sessionGenRef.current += 1
    setActive(true)
    setError(null)

    if (useServerRef.current) {
      startServerSession()
      return
    }

    startSession()

    renewIntervalRef.current = setInterval(() => {
      if (!activeRef.current || useServerRef.current) return
      sessionGenRef.current += 1
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
        recognitionRef.current = null
      }
      startSession()
    }, SESSION_RENEW_INTERVAL)
  }, [isSupported, stop, startSession, startServerSession])

  const setPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused
    serverRef.current?.setMuted(paused)
  }, [])

  useEffect(() => {
    return () => {
      if (renewIntervalRef.current) {
        clearInterval(renewIntervalRef.current)
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
      serverRef.current?.stop()
    }
  }, [])

  return { isSupported, active, listening, error, start, stop, setPaused }
}
