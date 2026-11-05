export const INTELLIGENCE_PANELS = [
  { id: 'briefing', label: 'Morning Briefing' },
  { id: 'clocks', label: 'World Clocks' },
  { id: 'news', label: 'World News' },
  { id: 'markets', label: 'Markets' },
  { id: 'system', label: 'System' },
  { id: 'earthquakes', label: 'Earthquakes' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'space', label: 'Space' },
  { id: 'weather', label: 'Weather' },
  { id: 'github', label: 'GitHub' },
  { id: 'security', label: 'Security' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'email', label: 'Email' },
  { id: 'agent', label: 'Agent Activity' },
  { id: 'screen', label: 'Screen & Control' },
  { id: 'memory', label: 'Memory' },
  { id: 'automations', label: 'Automations' },
  { id: 'diary', label: 'Diary' },
  { id: 'vision', label: 'Vision' },
  { id: 'holodeck', label: 'Holodeck' },
] as const

export type IntelligencePanelId = (typeof INTELLIGENCE_PANELS)[number]['id']

export const DEFAULT_INTELLIGENCE_CARD_ORDER: IntelligencePanelId[] = [
  'briefing',
  'clocks',
  'earthquakes',
  'news',
  'crypto',
  'markets',
  'space',
  'system',
  'weather',
  'github',
  'security',
  'calendar',
  'email',
  'agent',
]

export const DEFAULT_INTELLIGENCE_DETAIL_ORDER: IntelligencePanelId[] = [
  'screen',
  'memory',
  'automations',
  'diary',
  'vision',
  'holodeck',
]

export const DEFAULT_INTELLIGENCE_VISIBILITY: Record<IntelligencePanelId, boolean> = {
  briefing: true,
  clocks: true,
  news: true,
  markets: true,
  system: true,
  earthquakes: true,
  crypto: true,
  space: true,
  weather: true,
  github: true,
  security: true,
  calendar: true,
  email: true,
  agent: true,
  screen: true,
  memory: true,
  automations: true,
  diary: true,
  vision: true,
  holodeck: true,
}

export const DEFAULT_INTELLIGENCE_FULL_WIDTH: Record<IntelligencePanelId, boolean> = {
  briefing: false,
  clocks: false,
  news: false,
  markets: false,
  system: false,
  earthquakes: false,
  crypto: false,
  space: false,
  weather: false,
  github: false,
  security: false,
  calendar: false,
  email: false,
  agent: false,
  screen: false,
  memory: false,
  automations: false,
  diary: false,
  vision: false,
  holodeck: false,
}

const INTELLIGENCE_DETAIL_IDS: ReadonlySet<string> = new Set(DEFAULT_INTELLIGENCE_DETAIL_ORDER)
export const INTELLIGENCE_DETAIL_PANELS = INTELLIGENCE_PANELS.filter(panel => INTELLIGENCE_DETAIL_IDS.has(panel.id))

export interface IntelligenceLayout {
  visibility: Record<IntelligencePanelId, boolean>
  fullWidth: Record<IntelligencePanelId, boolean>
  cardOrder: IntelligencePanelId[]
  detailOrder: IntelligencePanelId[]
}

const STORAGE_KEY = 'friday_intelligence_layout'

function isPanelId(id: unknown): id is IntelligencePanelId {
  return typeof id === 'string' && INTELLIGENCE_PANELS.some(panel => panel.id === id)
}

function readOrder(value: unknown, defaults: IntelligencePanelId[]): IntelligencePanelId[] {
  const allowed = new Set(defaults)
  const stored = Array.isArray(value) ? value.filter(isPanelId).filter(id => allowed.has(id)) : []
  return [...new Set([...stored, ...defaults])]
}

export function readIntelligenceLayout(): IntelligenceLayout {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<IntelligenceLayout> | null
    const visibility = { ...DEFAULT_INTELLIGENCE_VISIBILITY }
    const fullWidth = { ...DEFAULT_INTELLIGENCE_FULL_WIDTH }
    if (stored?.visibility) {
      for (const panel of INTELLIGENCE_PANELS) {
        const value = stored.visibility[panel.id]
        if (typeof value === 'boolean') visibility[panel.id] = value
      }
    }
    if (stored?.fullWidth) {
      for (const panel of INTELLIGENCE_DETAIL_PANELS) {
        const value = stored.fullWidth[panel.id]
        if (typeof value === 'boolean') fullWidth[panel.id] = value
      }
    }

    return {
      visibility,
      fullWidth,
      cardOrder: readOrder(stored?.cardOrder, DEFAULT_INTELLIGENCE_CARD_ORDER),
      detailOrder: readOrder(stored?.detailOrder, DEFAULT_INTELLIGENCE_DETAIL_ORDER),
    }
  } catch {
    return {
      visibility: { ...DEFAULT_INTELLIGENCE_VISIBILITY },
      fullWidth: { ...DEFAULT_INTELLIGENCE_FULL_WIDTH },
      cardOrder: [...DEFAULT_INTELLIGENCE_CARD_ORDER],
      detailOrder: [...DEFAULT_INTELLIGENCE_DETAIL_ORDER],
    }
  }
}

export function writeIntelligenceLayout(layout: IntelligenceLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {}
}

export function moveIntelligencePanel(
  order: IntelligencePanelId[],
  source: IntelligencePanelId,
  target: IntelligencePanelId,
): IntelligencePanelId[] {
  const sourceIndex = order.indexOf(source)
  const targetIndex = order.indexOf(target)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return order

  const next = [...order]
  next.splice(sourceIndex, 1)
  next.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, source)
  return next
}
