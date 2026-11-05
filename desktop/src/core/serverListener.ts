import { transcribeAudio } from './api'
import audioWorkletUrl from './serverListener.worklet.js?url&no-inline'

/**
 * Microphone listener for environments where the Web Speech API doesn't work (Electron).
 * Detects utterances with a simple energy VAD, encodes each as 16 kHz mono WAV and sends it to
 * the backend Whisper endpoint. Stays open until stop() is called.
 */

export interface ServerListenerOptions {
  onSpeechStart: () => void
  onTranscript: (text: string) => void
  onError: (message: string) => void
  /** A single failed transcription. If provided the listener keeps running; otherwise onError is used. */
  onTranscribeError?: (message: string) => void
}

export interface ServerListener {
  stop: () => void
  /** While muted, audio is discarded (used so Friday's own voice isn't transcribed). */
  setMuted: (muted: boolean) => void
}

const TARGET_RATE = 16000
const START_RMS = 0.02
const END_SILENCE_MS = 900
const MIN_SPEECH_MS = 300
const MAX_UTTERANCE_MS = 15000
const PREROLL_MS = 300

export const isElectron = (): boolean =>
  typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)

function downsample(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_RATE) return input
  const ratio = fromRate / TARGET_RATE
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, input.length - 1)
    out[i] = input[i0] + (input[i1] - input[i0]) * (pos - i0)
  }
  return out
}

export function encodeWav(samples: Float32Array, rate = TARGET_RATE): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

export async function startServerListener(opts: ServerListenerOptions): Promise<ServerListener> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  })
  const ctx = new AudioContext()
  try {
    if (!ctx.audioWorklet) throw new Error('AudioWorklet is not supported in this browser')
    await ctx.audioWorklet.addModule(audioWorkletUrl)
  } catch (error) {
    stream.getTracks().forEach(t => t.stop())
    await ctx.close()
    throw error
  }
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
  console.info(`[voice] microphone open (${ctx.sampleRate} Hz, audio ${ctx.state})`)
  const source = ctx.createMediaStreamSource(stream)
  const proc = new AudioWorkletNode(ctx, 'friday-audio-capture', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
    channelCountMode: 'explicit',
    outputChannelCount: [1],
  })
  const mute = ctx.createGain()
  mute.gain.value = 0
  source.connect(proc)
  proc.connect(mute)
  mute.connect(ctx.destination)

  let stopped = false
  let peak = 0
  let muted = false
  let speaking = false
  let silenceMs = 0
  let speechMs = 0
  let chunks: Float32Array[] = []
  const preroll: Float32Array[] = []
  let prerollMs = 0

  const finishUtterance = () => {
    const voiced = speechMs
    const audio = chunks
    speaking = false
    silenceMs = 0
    speechMs = 0
    chunks = []
    if (voiced < MIN_SPEECH_MS) return
    console.info(`[voice] heard ${(voiced / 1000).toFixed(1)}s of speech, transcribing…`)
    const total = audio.reduce((n, c) => n + c.length, 0)
    const merged = new Float32Array(total)
    let off = 0
    for (const c of audio) { merged.set(c, off); off += c.length }
    transcribeAudio(encodeWav(downsample(merged, ctx.sampleRate)))
      .then(text => {
        console.info(`[voice] transcript: ${text ? JSON.stringify(text) : '(nothing intelligible)'}`)
        if (!stopped && !muted) opts.onTranscript(text)
      })
      .catch(e => {
        const msg = e?.message || 'Transcription failed'
        console.error(`[voice] transcription failed: ${msg}`)
        if (stopped) return
        if (opts.onTranscribeError) opts.onTranscribeError(msg)
        else opts.onError(msg)
      })
  }

  proc.port.onmessage = (e: MessageEvent<unknown>) => {
    if (stopped) return
    if (muted) {
      speaking = false
      silenceMs = 0
      speechMs = 0
      chunks = []
      preroll.length = 0
      prerollMs = 0
      return
    }
    if (!(e.data instanceof Float32Array)) return
    const data = e.data
    const ms = (data.length / ctx.sampleRate) * 1000
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
    const rms = Math.sqrt(sum / data.length)
    if (rms > peak) peak = rms

    if (!speaking) {
      preroll.push(data)
      prerollMs += ms
      while (prerollMs > PREROLL_MS && preroll.length > 1) prerollMs -= (preroll.shift()!.length / ctx.sampleRate) * 1000
      if (rms > START_RMS) {
        speaking = true
        chunks = [...preroll]
        preroll.length = 0
        prerollMs = 0
        speechMs = ms
        opts.onSpeechStart()
      }
      return
    }

    chunks.push(data)
    if (rms > START_RMS) { speechMs += ms; silenceMs = 0 } else silenceMs += ms
    const lengthMs = chunks.reduce((n, c) => n + c.length, 0) / ctx.sampleRate * 1000
    if (silenceMs >= END_SILENCE_MS || lengthMs >= MAX_UTTERANCE_MS) finishUtterance()
  }

  // If the mic is open but never loud enough to register speech, say so (it shows in the console drawer).
  const levelCheck = setInterval(() => {
    if (stopped || muted) return
    if (ctx.state !== 'running') console.warn(`[voice] audio context is ${ctx.state}; the microphone is not being read`)
    else if (peak < START_RMS) console.warn(`[voice] microphone level very low (peak ${peak.toFixed(4)}); check the Windows input device and volume`)
    peak = 0
  }, 10000)

  return {
    setMuted: (m: boolean) => { muted = m },
    stop: () => {
      if (stopped) return
      stopped = true
      clearInterval(levelCheck)
      proc.port.onmessage = null
      proc.port.close()
      try { source.disconnect(); proc.disconnect(); mute.disconnect() } catch {}
      stream.getTracks().forEach(t => t.stop())
      ctx.close().catch(() => {})
    },
  }
}
