export type ProviderName = 'claude' | 'ollama' | 'openrouter'

// Speech-to-text often mangles these names, so match common mishearings too.
const NAME_PATTERNS: [RegExp, ProviderName][] = [
  [/^(?:claude|clawed|clod|cloud code)$/, 'claude'],
  [/^(?:o?l+ama|alama|local)$/, 'ollama'],
  [/^open\s*-?\s*router$/, 'openrouter'],
]

const COMMAND = new RegExp(
  '^(?:hey\\s+friday[,\\s]+)?(?:please\\s+|can you\\s+|could you\\s+)?' +
    '(?:switch|change|go|swap|move|use|set)(?:\\s+(?:over|back))?' +
    '(?:\\s+(?:the\\s+)?(?:mode|model|provider|brain|llm))?' +
    '(?:\\s+(?:to|over to|into))?\\s+(?:the\\s+)?' +
    '(?<name>[a-z]+(?:\\s*-?\\s*router)?)' +
    '(?:\\s+(?:mode|model|provider))?(?:\\s+please)?$',
)
const BARE = /^(?<name>claude|o?l+ama|open\s*-?\s*router)\s+mode$/

/**
 * Recognises "switch to Claude", "use ollama", "change mode to open router", "Claude mode"...
 * The whole utterance must be the command, so ordinary chat like "use claude to write a poem" is not hijacked.
 */
export function parseProviderCommand(text: string): ProviderName | null {
  const cleaned = text
    .toLowerCase()
    .replace(/[.,!?;:"']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const match = COMMAND.exec(cleaned) ?? BARE.exec(cleaned)
  const name = match?.groups?.name?.trim()
  if (!name) return null
  for (const [pattern, provider] of NAME_PATTERNS) {
    if (pattern.test(name)) return provider
  }
  return null
}
