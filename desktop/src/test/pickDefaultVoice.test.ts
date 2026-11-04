import { describe, it, expect } from 'vitest'
import { pickDefaultVoice } from '../hooks/useVoiceOutput'

const v = (name: string, lang: string) => ({ name, lang, voiceURI: name }) as SpeechSynthesisVoice

describe('pickDefaultVoice', () => {
  it('prefers a known female English voice', () => {
    const voices = [v('Microsoft David', 'en-US'), v('Microsoft Zira', 'en-US')]
    expect(pickDefaultVoice(voices)?.name).toBe('Microsoft Zira')
  })

  it('falls back to the first English voice, then any voice', () => {
    expect(pickDefaultVoice([v('Hans', 'de-DE'), v('Bob', 'en-GB')])?.name).toBe('Bob')
    expect(pickDefaultVoice([v('Hans', 'de-DE')])?.name).toBe('Hans')
    expect(pickDefaultVoice([])).toBeUndefined()
  })
})
