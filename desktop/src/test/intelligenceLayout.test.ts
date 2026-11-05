import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_INTELLIGENCE_CARD_ORDER,
  DEFAULT_INTELLIGENCE_DETAIL_ORDER,
  DEFAULT_INTELLIGENCE_FULL_WIDTH,
  DEFAULT_INTELLIGENCE_VISIBILITY,
  moveIntelligencePanel,
  readIntelligenceLayout,
  writeIntelligenceLayout,
} from '../core/intelligenceLayout'

describe('intelligence layout', () => {
  beforeEach(() => localStorage.clear())

  it('restores visibility and panel order from local storage', () => {
    localStorage.setItem('friday_intelligence_layout', JSON.stringify({
      visibility: { news: false },
      cardOrder: ['markets', 'news', 'removed-panel'],
      detailOrder: ['diary'],
    }))

    const layout = readIntelligenceLayout()
    expect(layout.visibility.news).toBe(false)
    expect(layout.visibility.system).toBe(DEFAULT_INTELLIGENCE_VISIBILITY.system)
    expect(layout.fullWidth.diary).toBe(DEFAULT_INTELLIGENCE_FULL_WIDTH.diary)
    expect(layout.cardOrder.slice(0, 2)).toEqual(['markets', 'news'])
    expect(layout.cardOrder).toHaveLength(DEFAULT_INTELLIGENCE_CARD_ORDER.length)
    expect(layout.detailOrder[0]).toBe('diary')
    expect(layout.detailOrder).toHaveLength(DEFAULT_INTELLIGENCE_DETAIL_ORDER.length)
  })

  it('moves a dragged panel before its target', () => {
    expect(moveIntelligencePanel(['news', 'markets', 'system'], 'system', 'news'))
      .toEqual(['system', 'news', 'markets'])
    expect(moveIntelligencePanel(['news', 'markets', 'system'], 'news', 'system'))
      .toEqual(['markets', 'news', 'system'])
  })

  it('persists visibility and ordering changes', () => {
    const layout = readIntelligenceLayout()
    layout.visibility.news = false
    layout.fullWidth.diary = true
    layout.cardOrder = moveIntelligencePanel(layout.cardOrder, 'system', 'news')
    writeIntelligenceLayout(layout)

    expect(readIntelligenceLayout()).toEqual(layout)
  })
})
