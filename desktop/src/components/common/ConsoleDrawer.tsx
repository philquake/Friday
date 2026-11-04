import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConsoleLine } from '../../core/orbChannel'

const MAX_LINES = 2000
const SOURCES = ['api', 'vite', 'ui'] as const
const LEVEL_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#c8c8d0', debug: '#707078' }
const SOURCE_COLOR: Record<string, string> = { api: '#00a8ff', vite: '#a78bfa', ui: '#22c55e' }

/** Hidden-by-default console drawer (Window > Console, or Ctrl+`). Shows API/dev-server logs and page console output. */
export function ConsoleDrawer() {
  const bridge = window.friday?.console
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const bodyRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  const toggle = useCallback(() => setOpen(o => !o), [])

  useEffect(() => {
    if (!bridge) return
    let live = true
    void bridge.get().then(l => live && setLines(prev => (prev.length ? prev : l.slice(-MAX_LINES))))
    const offLine = bridge.onLine(line => setLines(prev => [...prev.slice(-(MAX_LINES - 1)), line]))
    const offToggle = bridge.onToggle(toggle)
    return () => {
      live = false
      offLine()
      offToggle()
    }
  }, [bridge, toggle])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  useEffect(() => {
    const el = bodyRef.current
    if (open && el && stick.current) el.scrollTop = el.scrollHeight
  }, [lines, open])

  if (!open) return null

  const shown = lines.filter(l => !hidden[l.source])

  return (
    <div
      data-testid="console-drawer"
      className="fixed left-0 right-0 bottom-0 z-50 flex flex-col"
      style={{ height: 260, background: 'rgba(8,8,10,0.97)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center gap-2 px-3 h-8 shrink-0 text-[10px] font-mono tracking-wider select-none"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#888' }}>
        <span style={{ color: '#ccc' }}>CONSOLE</span>
        {SOURCES.map(s => (
          <button key={s} onClick={() => setHidden(h => ({ ...h, [s]: !h[s] }))}
            className="px-1.5 py-0.5 rounded"
            style={{ color: hidden[s] ? '#555' : SOURCE_COLOR[s], border: '1px solid rgba(255,255,255,0.08)' }}
            aria-pressed={!hidden[s]}>
            {s}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={() => { setLines([]); void bridge?.clear() }} className="px-1.5 py-0.5 rounded hover:bg-white/[.06]">clear</button>
        <button onClick={toggle} aria-label="Close console" className="px-1.5 py-0.5 rounded hover:bg-white/[.06]">✕</button>
      </div>
      <div
        ref={bodyRef}
        onScroll={e => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
        }}
        className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[11px] leading-relaxed"
        style={{ scrollbarWidth: 'thin' }}
      >
        {!bridge && (
          <div style={{ color: '#666' }}>Server output is only captured in the Friday desktop app (npm run electron:dev).</div>
        )}
        {bridge && shown.length === 0 && (
          <div style={{ color: '#666' }}>
            No output yet. Launch with <span style={{ color: '#aaa' }}>python main.py --ui</span> to stream API and dev-server logs here.
          </div>
        )}
        {shown.map((l, i) => (
          <div key={`${l.t}-${i}`} className="whitespace-pre-wrap break-all">
            <span style={{ color: '#505058' }}>{new Date(l.t).toLocaleTimeString([], { hour12: false })} </span>
            <span style={{ color: SOURCE_COLOR[l.source] }}>[{l.source}] </span>
            <span style={{ color: LEVEL_COLOR[l.level] ?? '#c8c8d0' }}>{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
