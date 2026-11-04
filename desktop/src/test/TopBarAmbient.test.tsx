import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StatusRibbon } from '../components/topbar/TopBar'

const base = {
  systemInfo: {} as any,
  latency: 0,
  orbState: 'idle',
  memory: 0,
  backendOnline: true,
  onCommandPalette: () => {},
  voiceOutputEnabled: true,
  onToggleVoiceOutput: () => {},
  voiceOutputStatus: 'idle',
  ambientActive: true,
}

describe('StatusRibbon ambient label', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('does not flicker when recognition restarts quickly', () => {
    const { rerender } = render(<StatusRibbon {...base} voiceInputStatus="listening" />)
    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.getByText('AMBIENT')).toBeTruthy()

    rerender(<StatusRibbon {...base} voiceInputStatus="idle" />)
    act(() => { vi.advanceTimersByTime(200) })
    rerender(<StatusRibbon {...base} voiceInputStatus="listening" />)
    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.getByText('AMBIENT')).toBeTruthy()
  })

  it('switches to AWAITING once idle has held', () => {
    const { rerender } = render(<StatusRibbon {...base} voiceInputStatus="listening" />)
    act(() => { vi.advanceTimersByTime(700) })
    rerender(<StatusRibbon {...base} voiceInputStatus="idle" />)
    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.getByText('AWAITING')).toBeTruthy()
  })
})
