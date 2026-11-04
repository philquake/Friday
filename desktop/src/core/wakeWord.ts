/**
 * Wake-phrase matching that tolerates how speech-to-text writes "Hey Friday"
 * ("Hey, Friday.", "hay friday", "Hey Fry Day"...). Returns whatever was said after the phrase,
 * so "Hey Friday, what's the weather?" can be acted on in one go.
 */
const WAKE_RE = /\b(?:hey|hay|hi|ok|okay)\s+(?:friday|fry\s?day|fri\s?day)\b/

export function matchWake(text: string): { matched: boolean; command: string } {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const m = WAKE_RE.exec(cleaned)
  if (!m) return { matched: false, command: '' }
  return { matched: true, command: cleaned.slice(m.index + m[0].length).trim() }
}
