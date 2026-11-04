import { useEffect, useRef, useState } from 'react'
import type { OrbState } from '../../types'
import { JarvisOrb } from '../center/AiCore'
import { subscribeOrb } from '../../core/orbChannel'

const DRAG_THRESHOLD = 3 // px of movement before a press becomes a drag (so double-click still works)

export function FloatingOrb() {
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [voiceActivity, setVoiceActivity] = useState(false)
  const [pinned, setPinned] = useState(true)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  // Dragging is done in JS (not CSS app-region) because drag regions swallow double-click and right-click on Windows.
  const drag = useRef<{ sx: number; sy: number; wx: number; wy: number; moved: boolean } | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('orb-window')
    return () => document.documentElement.classList.remove('orb-window')
  }, [])

  useEffect(() => subscribeOrb(m => {
    setOrbState(m.orbState)
    setVoiceActivity(m.voiceActivity)
  }), [])

  useEffect(() => {
    const orb = window.friday?.orb
    if (!orb) return
    void orb.getState().then(s => setPinned(s.pinned))
    return orb.onChange(s => setPinned(s.pinned))
  }, [])

  const close = () => setMenu(null)
  const act = (fn?: () => Promise<void> | void) => () => {
    close()
    void fn?.()
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const orb = window.friday?.orb
    if (!orb) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const start = { sx: e.screenX, sy: e.screenY, wx: 0, wy: 0, moved: false }
    drag.current = start
    void orb.dragStart().then(([wx, wy]) => {
      start.wx = wx
      start.wy = wy
    })
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.screenX - d.sx
    const dy = e.screenY - d.sy
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    window.friday?.orb.dragMove(d.wx + dx, d.wy + dy)
  }

  const onPointerUp = () => {
    if (drag.current?.moved) window.friday?.orb.dragEnd()
    drag.current = null
  }

  return (
    <div
      data-testid="floating-orb"
      style={{ position: 'fixed', inset: 0, cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={e => {
        e.preventDefault()
        setMenu({ x: Math.min(e.clientX, 110), y: Math.min(e.clientY, 150) })
      }}
      onDoubleClick={() => void window.friday?.orb.openMain()}
      onClick={() => menu && close()}
    >
      <div className="absolute inset-0 pointer-events-none">
        <JarvisOrb orbState={orbState} handPosition={null} voiceActivity={voiceActivity} />
      </div>
      {menu && (
        <div
          role="menu"
          style={{ left: menu.x, top: menu.y, cursor: 'default' }}
          onPointerDown={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          className="absolute z-10 w-36 rounded-lg py-1 text-xs text-neutral-200 bg-neutral-900/95 border border-white/10 shadow-lg"
        >
          <button role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-white/10"
            onClick={act(() => window.friday?.orb.setPinned(!pinned))}>
            {pinned ? '✓ ' : ''}Always on top
          </button>
          <button role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-white/10"
            onClick={act(() => window.friday?.orb.openMain())}>
            Open Friday
          </button>
          <button role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-white/10"
            onClick={act(() => window.friday?.orb.hide())}>
            Hide orb
          </button>
        </div>
      )}
    </div>
  )
}
