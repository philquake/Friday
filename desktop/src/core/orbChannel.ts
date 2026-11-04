import type { OrbState } from '../types'
import { toast } from './ToastStore'

export interface OrbBroadcast {
  orbState: OrbState
  voiceActivity: boolean
}

export interface FridayOrbBridge {
  show(): Promise<void>
  hide(): Promise<void>
  toggle(): Promise<void>
  pin(): Promise<void>
  unpin(): Promise<void>
  setPinned(pinned: boolean): Promise<void>
  getState(): Promise<{ visible: boolean; pinned: boolean }>
  openMain(): Promise<void>
  dragStart(): Promise<[number, number]>
  dragMove(x: number, y: number): void
  dragEnd(): void
  onChange(cb: (s: { visible: boolean; pinned: boolean }) => void): () => void
}

export interface ConsoleLine {
  t: number
  source: 'api' | 'vite' | 'ui'
  level: 'debug' | 'info' | 'warn' | 'error'
  text: string
}

export interface FridayConsoleBridge {
  get(): Promise<ConsoleLine[]>
  clear(): Promise<void>
  onLine(cb: (line: ConsoleLine) => void): () => void
  onToggle(cb: () => void): () => void
}

declare global {
  interface Window {
    friday?: { orb: FridayOrbBridge; console?: FridayConsoleBridge }
  }
}

const CHANNEL = 'friday-orb'

/** True when running inside the Electron shell (floating orb available). */
export const hasOrbBridge = (): boolean => typeof window !== 'undefined' && !!window.friday?.orb

export function publishOrb(msg: OrbBroadcast): void {
  if (typeof BroadcastChannel === 'undefined') return
  const ch = new BroadcastChannel(CHANNEL)
  ch.postMessage(msg)
  ch.close()
}

export function subscribeOrb(cb: (msg: OrbBroadcast) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const ch = new BroadcastChannel(CHANNEL)
  ch.onmessage = (e: MessageEvent<OrbBroadcast>) => cb(e.data)
  return () => ch.close()
}

export type OrbAction = 'show' | 'hide' | 'toggle' | 'pin' | 'unpin'

export const ORB_NEEDS_APP_MSG = 'The floating orb needs the Friday desktop app (npm run electron:dev).'

/** Toggle the floating orb, or explain why it's unavailable in a plain browser. */
export function toggleFloatingOrb(): void {
  if (!runOrbAction('toggle')) toast('info', ORB_NEEDS_APP_MSG)
}

/** Run an orb action via the Electron bridge. Returns false in a plain browser. */
export function runOrbAction(action: OrbAction): boolean {
  const orb = window.friday?.orb
  if (!orb) return false
  void orb[action]()
  return true
}
