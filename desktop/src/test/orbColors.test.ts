import { describe, it, expect } from 'vitest'
import { ORB_STATE_COLORS, orbColor, orbVisualState } from '../core/orbColors'

describe('orbColors', () => {
  it('gives every state a distinct hex color', () => {
    const colors = Object.values(ORB_STATE_COLORS)
    expect(colors.every(c => /^#[0-9a-f]{6}$/i.test(c))).toBe(true)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('falls back to idle for unknown states', () => {
    expect(orbColor('nonsense')).toBe(ORB_STATE_COLORS.idle)
    expect(orbColor('error')).toBe(ORB_STATE_COLORS.error)
  })

  it('uses the chat typing indicator color for thinking', () => {
    expect(orbColor('thinking')).toBe('#f59e0b')
  })

  it('keeps the thinking color during voice activity', () => {
    expect(orbVisualState('thinking', true)).toBe('thinking')
    expect(orbVisualState('idle', true)).toBe('speaking')
    expect(orbVisualState('offline', true)).toBe('offline')
  })

  it('keeps listening visually distinct from idle during voice activity', () => {
    expect(orbVisualState('listening', true)).toBe('listening')
    expect(orbColor('listening')).not.toBe(orbColor('idle'))
  })

  it('preserves every explicit state color during voice activity', () => {
    const states = Object.keys(ORB_STATE_COLORS) as Array<keyof typeof ORB_STATE_COLORS>
    for (const state of states) {
      expect(orbVisualState(state, true)).toBe(state === 'idle' ? 'speaking' : state)
    }
  })
})
