import type { OrbState } from '../types'

/** Accent color per orb state: drives the 3D orb tint and the state labels. */
export const ORB_STATE_COLORS: Record<OrbState, string> = {
  idle: '#8fb4ff',
  listening: '#34d399',
  thinking: '#f59e0b',
  reasoning: '#a78bfa',
  executing: '#fb923c',
  searching: '#22d3ee',
  coding: '#f472b6',
  speaking: '#38bdf8',
  error: '#ef4444',
  offline: '#4b5563',
}

export const orbColor = (state: string): string => ORB_STATE_COLORS[state as OrbState] ?? ORB_STATE_COLORS.idle

export const orbVisualState = (state: OrbState, voiceActivity: boolean): OrbState =>
  state === 'offline' || state === 'thinking' ? state : voiceActivity ? 'speaking' : state
