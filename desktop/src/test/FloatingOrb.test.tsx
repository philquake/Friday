import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('../components/center/AiCore', () => ({
  JarvisOrb: ({ orbState }: { orbState: string }) => <div data-testid="orb">{orbState}</div>,
}))

import { FloatingOrb } from '../components/zen/FloatingOrb'
import { publishOrb, runOrbAction } from '../core/orbChannel'

const bridge = () => ({
  show: vi.fn().mockResolvedValue(undefined),
  hide: vi.fn().mockResolvedValue(undefined),
  toggle: vi.fn().mockResolvedValue(undefined),
  pin: vi.fn().mockResolvedValue(undefined),
  unpin: vi.fn().mockResolvedValue(undefined),
  setPinned: vi.fn().mockResolvedValue(undefined),
  getState: vi.fn().mockResolvedValue({ visible: true, pinned: true }),
  openMain: vi.fn().mockResolvedValue(undefined),
  dragStart: vi.fn().mockResolvedValue([100, 200]),
  dragMove: vi.fn(),
  dragEnd: vi.fn(),
  onChange: vi.fn(() => () => {}),
})

describe('FloatingOrb', () => {
  beforeEach(() => {
    window.friday = { orb: bridge() }
  })
  afterEach(() => {
    delete window.friday
  })

  it('mirrors orb state published by the main window', async () => {
    render(<FloatingOrb />)
    expect(screen.getByTestId('orb').textContent).toBe('idle')
    await act(async () => {
      publishOrb({ orbState: 'thinking', voiceActivity: false })
      await new Promise(r => setTimeout(r, 20))
    })
    expect(screen.getByTestId('orb').textContent).toBe('thinking')
  })

  it('right-click opens a menu that can hide the orb', () => {
    render(<FloatingOrb />)
    fireEvent.contextMenu(screen.getByTestId('floating-orb'))
    fireEvent.click(screen.getByText('Hide orb'))
    expect(window.friday!.orb.hide).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('FloatingOrb interactions', () => {
  beforeEach(() => {
    window.friday = { orb: bridge() }
  })
  afterEach(() => {
    delete window.friday
  })

  it('double-click opens the main window', () => {
    render(<FloatingOrb />)
    fireEvent.doubleClick(screen.getByTestId('floating-orb'))
    expect(window.friday!.orb.openMain).toHaveBeenCalled()
  })

  it('dragging moves the window from its start position by the pointer delta', async () => {
    render(<FloatingOrb />)
    const el = screen.getByTestId('floating-orb')
    el.setPointerCapture = vi.fn()
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, screenX: 500, screenY: 500 })
    await act(async () => { await Promise.resolve() })
    fireEvent.pointerMove(el, { pointerId: 1, screenX: 530, screenY: 480 })
    expect(window.friday!.orb.dragMove).toHaveBeenCalledWith(130, 180)
    fireEvent.pointerUp(el, { pointerId: 1 })
    expect(window.friday!.orb.dragEnd).toHaveBeenCalled()
  })

  it('a tiny movement is a click, not a drag', async () => {
    render(<FloatingOrb />)
    const el = screen.getByTestId('floating-orb')
    el.setPointerCapture = vi.fn()
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, screenX: 500, screenY: 500 })
    fireEvent.pointerMove(el, { pointerId: 1, screenX: 501, screenY: 500 })
    fireEvent.pointerUp(el, { pointerId: 1 })
    expect(window.friday!.orb.dragMove).not.toHaveBeenCalled()
    expect(window.friday!.orb.dragEnd).not.toHaveBeenCalled()
  })
})

describe('runOrbAction', () => {
  it('returns false without the Electron bridge', () => {
    delete window.friday
    expect(runOrbAction('toggle')).toBe(false)
  })

  it('calls the bridge when present', () => {
    window.friday = { orb: bridge() }
    expect(runOrbAction('pin')).toBe(true)
    expect(window.friday.orb.pin).toHaveBeenCalled()
    delete window.friday
  })
})
