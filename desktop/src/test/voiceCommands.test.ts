import { describe, it, expect } from 'vitest'
import { parseProviderCommand } from '../core/voiceCommands'

describe('parseProviderCommand', () => {
  it.each([
    ['switch to claude', 'claude'],
    ['Switch to Claude.', 'claude'],
    ['please switch to ollama', 'ollama'],
    ['use open router', 'openrouter'],
    ['Change mode to OpenRouter!', 'openrouter'],
    ['switch to the local model', 'ollama'],
    ['hey friday, switch to claude', 'claude'],
    ['go back to ollama', 'ollama'],
    ['claude mode', 'claude'],
    ['switch provider to open-router', 'openrouter'],
    ['switch to olama', 'ollama'],
    ['can you switch to claude please', 'claude'],
  ])('recognises "%s"', (text, expected) => {
    expect(parseProviderCommand(text)).toBe(expected)
  })

  it.each([
    'use claude to write a poem',
    'what is claude',
    'switch to the next tab',
    'tell me about ollama',
    'switch to claude and then open my email',
    '',
  ])('ignores "%s"', (text) => {
    expect(parseProviderCommand(text)).toBeNull()
  })
})
