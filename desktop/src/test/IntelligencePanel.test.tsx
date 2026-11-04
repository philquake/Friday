import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../components/holodeck/HolodeckPanel', () => ({ HolodeckPanel: () => <div data-testid="holodeck" /> }))

import { IntelligencePanel } from '../components/sidebar/IntelligencePanel'

const info = { hostname: 'box-1', uptime_seconds: 60, cpu_cores: 4, model: 'm', llm_calls: 1, tokens_used: 2 } as any
const panel = <IntelligencePanel news={[]} weather={null} stocks={[]} repos={[]} systemInfo={info} recentTools={[]} />

describe('IntelligencePanel collapsing', () => {
  beforeEach(() => localStorage.clear())

  it('collapses a section and remembers the choice across remounts', () => {
    const { unmount } = render(panel)
    expect(screen.getByText('box-1')).toBeTruthy()
    fireEvent.click(screen.getByTestId('intel-toggle-system'))
    expect(screen.queryByText('box-1')).toBeNull()
    unmount()
    render(panel)
    expect(screen.queryByText('box-1')).toBeNull()
    fireEvent.click(screen.getByTestId('intel-toggle-system'))
    expect(screen.getByText('box-1')).toBeTruthy()
  })

  it('exposes aria-expanded on the toggle', () => {
    render(panel)
    const t = screen.getByTestId('intel-toggle-system')
    expect(t.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(t)
    expect(t.getAttribute('aria-expanded')).toBe('false')
  })
})
