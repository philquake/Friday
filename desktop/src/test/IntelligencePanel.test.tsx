import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DEFAULT_INTELLIGENCE_FULL_WIDTH, DEFAULT_INTELLIGENCE_VISIBILITY } from '../core/intelligenceLayout'

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

  it('hides disabled panels and lets users drag panels to reorder them', () => {
    const onPanelReorder = vi.fn()
    render(
      <IntelligencePanel
        news={[]}
        weather={null}
        stocks={[]}
        repos={[]}
        systemInfo={info}
        recentTools={[]}
        panelVisibility={{ ...DEFAULT_INTELLIGENCE_VISIBILITY, system: false }}
        onPanelReorder={onPanelReorder}
      />,
    )

    expect(screen.queryByText('box-1')).toBeNull()
    const news = screen.getByTestId('intel-panel-news')
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => 'system'), effectAllowed: '' }
    fireEvent.dragStart(news, { dataTransfer })
    fireEvent.drop(screen.getByTestId('intel-panel-markets'), { dataTransfer })

    expect(onPanelReorder).toHaveBeenCalledWith('cards', 'news', 'markets')
  })

  it('shows the weather location with the current conditions', () => {
    render(
      <IntelligencePanel
        news={[]}
        weather={{
          temperature: 18,
          feels_like: 17,
          humidity: 45,
          wind_speed: 4,
          weather_code: 0,
          location: 'Current location',
        }}
        stocks={[]}
        repos={[]}
        systemInfo={info}
        recentTools={[]}
      />,
    )

    expect(screen.getByText(/Current location/)).toBeTruthy()
  })

  it('expands World News to show additional loaded headlines', () => {
    const news = Array.from({ length: 7 }, (_, index) => ({
      title: `Headline ${index + 1}`,
      url: `https://example.com/${index + 1}`,
      source: 'Example',
      time: new Date().toISOString(),
    }))
    render(
      <IntelligencePanel
        news={news}
        weather={null}
        stocks={[]}
        repos={[]}
        systemInfo={info}
        recentTools={[]}
      />,
    )

    expect(screen.getByText('Headline 5')).toBeTruthy()
    expect(screen.queryByText('Headline 6')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View more' }))
    expect(screen.getByText('Headline 6')).toBeTruthy()
    expect(screen.getByText('Headline 7')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }))
    expect(screen.queryByText('Headline 6')).toBeNull()
  })

  it('uses a masonry layout so intelligence cards flow into open space', () => {
    render(
      <IntelligencePanel
        news={[{ title: 'Headline', url: 'https://example.com', source: 'Example', time: new Date().toISOString() }]}
        weather={null}
        stocks={[]}
        repos={[]}
        systemInfo={info}
        recentTools={[]}
        briefing={{ summary: 'Test briefing', sections: [], greeting: 'Hello' }}
      />,
    )

    const cards = screen.getByTestId('intel-panel-group-cards')
    expect(cards.className).toContain('columns-2')
    expect(cards.className).not.toContain('grid')
    expect(screen.getByTestId('intel-panel-briefing').style.columnSpan).toBe('none')
    expect(screen.getByTestId('intel-panel-news').style.breakInside).toBe('avoid')
    expect(screen.getByTestId('intel-panel-group-details').className).toContain('columns-2')
  })

  it('spans a selected lower panel across both columns', () => {
    render(
      <IntelligencePanel
        news={[]}
        weather={null}
        stocks={[]}
        repos={[]}
        systemInfo={info}
        recentTools={[]}
        memoryData={null}
        fullWidthPanels={{ ...DEFAULT_INTELLIGENCE_FULL_WIDTH, diary: true }}
      />,
    )

    expect(screen.getByTestId('intel-panel-diary').style.columnSpan).toBe('all')
    expect(screen.getByTestId('intel-panel-memory').style.columnSpan).toBe('none')
  })
})
