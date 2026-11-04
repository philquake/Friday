import { useCallback, useState } from 'react'

const STORAGE_KEY = 'friday_collapsed_sections'

function readAll(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

/** Collapsed state for a named section, remembered across reloads. */
export function useCollapsed(id: string, defaultCollapsed = false): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => readAll()[id] ?? defaultCollapsed)
  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [id]: next }))
      } catch {
        /* storage unavailable: state still works for this session */
      }
      return next
    })
  }, [id])
  return [collapsed, toggle]
}

export function Chevron({ collapsed }: { collapsed: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block text-[9px] transition-transform duration-150"
      style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', color: '#666' }}
    >
      ▼
    </span>
  )
}

/** Props to spread on a header element so clicking or pressing Enter/Space toggles the section. */
export function toggleProps(collapsed: boolean, toggle: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-expanded': !collapsed,
    onClick: toggle,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        toggle()
      }
    },
  }
}
