import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ConsoleDrawer } from '../components/common/ConsoleDrawer'
import type { ConsoleLine } from '../core/orbChannel'

function mockBridge(initial: ConsoleLine[] = []) {
  const handlers = { line: null as null | ((l: ConsoleLine) => void), toggle: null as null | (() => void) }
  window.friday = {
    orb: {} as any,
    console: {
      get: vi.fn().mockResolvedValue(initial),
      clear: vi.fn().mockResolvedValue(undefined),
      onLine: cb => { handlers.line = cb; return () => {} },
      onToggle: cb => { handlers.toggle = cb; return () => {} },
    },
  }
  return handlers
}

afterEach(() => { delete window.friday })

describe('ConsoleDrawer', () => {
  it('is hidden until toggled, then shows streamed lines and can filter by source', async () => {
    const h = mockBridge([{ t: 1, source: 'api', level: 'info', text: 'server up' }])
    render(<ConsoleDrawer />)
    expect(screen.queryByTestId('console-drawer')).toBeNull()

    await act(async () => { h.toggle!() })
    expect(await screen.findByText('server up')).toBeTruthy()

    act(() => h.line!({ t: 2, source: 'ui', level: 'error', text: 'boom' }))
    expect(screen.getByText('boom')).toBeTruthy()

    fireEvent.click(screen.getByText('ui'))
    expect(screen.queryByText('boom')).toBeNull()
  })

  it('opens with Ctrl+` and closes again', async () => {
    mockBridge()
    render(<ConsoleDrawer />)
    fireEvent.keyDown(window, { key: '`', ctrlKey: true })
    expect(await screen.findByTestId('console-drawer')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Close console'))
    expect(screen.queryByTestId('console-drawer')).toBeNull()
  })

  it('explains itself in a plain browser', () => {
    render(<ConsoleDrawer />)
    fireEvent.keyDown(window, { key: '`', ctrlKey: true })
    expect(screen.getByText(/only captured in the Friday desktop app/)).toBeTruthy()
  })
})
