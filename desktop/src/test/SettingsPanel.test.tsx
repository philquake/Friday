import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPanel } from '../components/settings/SettingsPanel'
import { DEFAULT_INTELLIGENCE_FULL_WIDTH, DEFAULT_INTELLIGENCE_VISIBILITY } from '../core/intelligenceLayout'

vi.mock('../core/api', () => ({
  getPlugins: vi.fn().mockResolvedValue([
    { name: 'run_command', builtin: true, installed: true, enabled: true, description: '' },
    { name: 'fun', builtin: false, installed: false, enabled: false, description: 'Community tool plugin.' },
  ]),
  installPlugin: vi.fn().mockResolvedValue({ success: true, message: 'installed fun' }),
  uninstallPlugin: vi.fn().mockResolvedValue({ success: true, message: 'uninstalled fun' }),
  getCustomTools: vi.fn().mockResolvedValue([
    { name: 'dir_size', description: 'Returns size of a directory', parameters: { type: 'object', properties: {}, required: [] }, body: 'def run(**kwargs):\n    return {}', source: 'size of a folder' },
  ]),
  createCustomTool: vi.fn().mockResolvedValue({ tool: { name: 'new_tool', description: 'd' } }),
  deleteCustomTool: vi.fn().mockResolvedValue({ success: true }),
  getPrivacyStatus: vi.fn().mockResolvedValue({ enabled: false, local_provider: 'ollama', blocked_tools: [] }),
  setPrivacy: vi.fn().mockResolvedValue({ enabled: true, local_provider: 'ollama', blocked_tools: [] }),
}))

const baseProps = {
  onClose: () => {},
  voiceOutputEnabled: false,
  onToggleVoiceOutput: () => {},
  voiceLanguage: 'English',
  onCycleLanguage: () => {},
  wakeWordActive: false,
  onToggleWakeWord: () => {},
  camActive: false,
  onToggleCamera: () => {},
  backendOnline: true,
  calendarAuth: '',
  emailAuth: '',
  onGoogleConnect: () => {},
  persona: 'friday',
  onSetPersona: () => {},
  intelligenceVisibility: DEFAULT_INTELLIGENCE_VISIBILITY,
  onToggleIntelligencePanel: () => {},
  intelligenceFullWidth: DEFAULT_INTELLIGENCE_FULL_WIDTH,
  onToggleIntelligenceFullWidth: () => {},
}

describe('SettingsPanel', () => {
  it('renders plugin marketplace section', async () => {
    render(<SettingsPanel {...baseProps} />)
    expect(screen.getByText('PLUGINS')).toBeTruthy()
    expect(await screen.findByText('fun')).toBeTruthy()
    expect(screen.getByText('Install')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
  })

  it('renders custom tool builder section', async () => {
    render(<SettingsPanel {...baseProps} />)
    expect(screen.getByText('CUSTOM TOOLS')).toBeTruthy()
    expect(await screen.findByText('dir_size')).toBeTruthy()
    expect(screen.getByText('Build tool')).toBeTruthy()
  })

  it('renders blackout privacy toggle', async () => {
    render(<SettingsPanel {...baseProps} />)
    expect(screen.getByText(/Blackout Mode/)).toBeTruthy()
  })

  it('lets the user pick the temperature unit', () => {
    const onSetTemperatureUnit = vi.fn()
    render(<SettingsPanel {...baseProps} temperatureUnit="C" onSetTemperatureUnit={onSetTemperatureUnit} />)
    expect(screen.getByText('°C').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByText('°F'))
    expect(onSetTemperatureUnit).toHaveBeenCalledWith('F')
  })

  it('shows Intelligence panel toggles in its own Settings tab', () => {
    const onToggleIntelligencePanel = vi.fn()
    render(<SettingsPanel {...baseProps} onToggleIntelligencePanel={onToggleIntelligencePanel} />)

    fireEvent.click(screen.getByRole('button', { name: 'intelligence' }))
    const newsToggle = screen.getByRole('switch', { name: 'World News' })
    expect(newsToggle.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(newsToggle)

    expect(onToggleIntelligencePanel).toHaveBeenCalledWith('news')
  })

  it('offers full-width switches for lower panels only', () => {
    const onToggleIntelligenceFullWidth = vi.fn()
    render(<SettingsPanel {...baseProps} onToggleIntelligenceFullWidth={onToggleIntelligenceFullWidth} />)

    fireEvent.click(screen.getByRole('button', { name: 'intelligence' }))
    const diaryToggle = screen.getByRole('switch', { name: 'Full width: Diary' })
    expect(diaryToggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByRole('switch', { name: 'Full width: World News' })).toBeNull()
    fireEvent.click(diaryToggle)

    expect(onToggleIntelligenceFullWidth).toHaveBeenCalledWith('diary')
  })
})
