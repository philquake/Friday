import { describe, it, expect } from 'vitest'
import { ORB_STATE_COLORS, orbColor } from '../core/orbColors'

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
})
