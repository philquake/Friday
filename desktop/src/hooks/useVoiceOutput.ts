import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchTtsAudio, getTtsAvailable } from '../core/api'

export type VoiceOutputStatus = 'idle' | 'speaking' | 'paused'

export interface SpeakOptions {
  rate?: number
  pitch?: number
  persona?: string
}

interface UseVoiceOutputReturn {
  isSupported: boolean
  enabled: boolean
  setEnabled: (v: boolean) => void
  status: VoiceOutputStatus
  speak: (text: string, options?: SpeakOptions) => void
  stop: () => void
  pause: () => void
  resume: () => void
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  setVoice: (voice: SpeechSynthesisVoice) => void
}

const VOICE_STORAGE_KEY = 'friday_tts_voice_uri'
const FEMALE_VOICE_RE = /aria|jenny|zira|samantha|hazel|susan|female/i

export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const en = voices.filter(vo => vo.lang.startsWith('en'))
  return en.find(vo => FEMALE_VOICE_RE.test(vo.name)) || en[0] || voices[0]
}

export function useVoiceOutput(): UseVoiceOutputReturn {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('friday_voice_output_enabled')
    return saved ? saved === 'true' : false
  })
  const [status, setStatus] = useState<VoiceOutputStatus>('idle')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoiceState] = useState<SpeechSynthesisVoice | null>(null)
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const serverTtsRef = useRef(false)
  const generationRef = useRef(0)
  const speakQueueRef = useRef<{ text: string; options?: SpeakOptions }[]>([])
  const speakingRef = useRef(false)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window

  const processQueue = useCallback(() => {
    if (speakingRef.current || speakQueueRef.current.length === 0) return

    const item = speakQueueRef.current.shift()!
    speakingRef.current = true
    const generation = generationRef.current

    const next = () => {
      if (generation !== generationRef.current) return
      speakingRef.current = false
      if (speakQueueRef.current.length > 0) processQueue()
      else setStatus('idle')
    }

    const speakInBrowser = () => {
      const synth = synthRef.current
      if (!synth) return next()
      const utterance = new SpeechSynthesisUtterance(item.text)
      if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current
      utterance.rate = item.options?.rate ?? 1
      utterance.pitch = item.options?.pitch ?? 1
      utterance.volume = 1
      utterance.onstart = () => setStatus('speaking')
      utterance.onend = next
      utterance.onerror = () => {
        speakingRef.current = false
        setStatus('idle')
      }
      utterance.onpause = () => setStatus('paused')
      utterance.onresume = () => setStatus('speaking')
      utteranceRef.current = utterance
      synth.speak(utterance)
    }

    if (!serverTtsRef.current) return speakInBrowser()

    fetchTtsAudio(item.text, item.options?.persona).then(blob => {
      if (generation !== generationRef.current) return
      if (!blob) {
        serverTtsRef.current = false // server voice unavailable: use browser voice from now on
        return speakInBrowser()
      }
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      const done = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === audio) audioRef.current = null
        next()
      }
      audio.onplay = () => setStatus('speaking')
      audio.onpause = () => { if (!audio.ended && audioRef.current === audio) setStatus('paused') }
      audio.onended = done
      audio.onerror = done
      audio.play().catch(done)
    })
  }, [])

  const speak = useCallback((text: string, options?: SpeakOptions) => {
    if (!isSupported || !enabled || !text.trim()) return
    speakQueueRef.current.push({ text, options })
    processQueue()
  }, [isSupported, enabled, processQueue])

  const stop = useCallback(() => {
    generationRef.current++
    const synth = synthRef.current
    if (synth) synth.cancel()
    const audio = audioRef.current
    if (audio) {
      audioRef.current = null
      audio.onpause = null
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    speakQueueRef.current = []
    speakingRef.current = false
    setStatus('idle')
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause()
    else synthRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current) audioRef.current.play().catch(() => {})
    else synthRef.current?.resume()
  }, [])

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    selectedVoiceRef.current = voice
    setSelectedVoiceState(voice)
    try { localStorage.setItem(VOICE_STORAGE_KEY, voice.voiceURI) } catch {}
  }, [])

  const setEnabledWrapped = useCallback((v: boolean) => {
    setEnabled(v)
    try { localStorage.setItem('friday_voice_output_enabled', String(v)) } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false
    getTtsAvailable().then(ok => { if (!cancelled) serverTtsRef.current = ok })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isSupported) return
    const synth = window.speechSynthesis
    synthRef.current = synth

    const loadVoices = () => {
      const v = synth.getVoices()
      if (v.length > 0) {
        setVoices(v)
        const savedURI = localStorage.getItem(VOICE_STORAGE_KEY)
        if (savedURI) {
          const match = v.find(vo => vo.voiceURI === savedURI)
          if (match) {
            selectedVoiceRef.current = match
            setSelectedVoiceState(match)
            return
          }
        }
        if (!selectedVoiceRef.current) {
          const fallback = pickDefaultVoice(v)!
          selectedVoiceRef.current = fallback
          setSelectedVoiceState(fallback)
        }
      }
    }

    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)
    return () => synth.removeEventListener('voiceschanged', loadVoices)
  }, [isSupported])

  return {
    isSupported, enabled, setEnabled: setEnabledWrapped,
    status, speak, stop, pause, resume,
    voices, selectedVoice, setVoice,
  }
}
