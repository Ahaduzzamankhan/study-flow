import type { TimerMode, TimerState } from '@shared/types'

export const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus session',
  short_break: 'Short break',
  long_break: 'Long break',
}

export function durationForMode(mode: TimerMode, settings: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number }): number {
  if (mode === 'short_break') return Math.max(1, settings.shortBreakMinutes) * 60
  if (mode === 'long_break') return Math.max(1, settings.longBreakMinutes) * 60
  return Math.max(1, settings.focusMinutes) * 60
}

/**
 * Remaining seconds are always derived from wall-clock timestamps so the timer
 * stays correct while the window is minimised, the machine sleeps or the
 * renderer throttles timers.
 */
export function remainingSeconds(state: Pick<TimerState, 'status' | 'endsAt' | 'remainingSeconds'>, now: number = Date.now()): number {
  if (state.status === 'running' && state.endsAt) {
    const ends = new Date(state.endsAt).getTime()
    if (Number.isNaN(ends)) return Math.max(0, state.remainingSeconds)
    return Math.max(0, Math.round((ends - now) / 1000))
  }
  return Math.max(0, Math.round(state.remainingSeconds))
}

export function isExpired(state: Pick<TimerState, 'status' | 'endsAt'>, now: number = Date.now()): boolean {
  if (state.status !== 'running' || !state.endsAt) return false
  return new Date(state.endsAt).getTime() <= now
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function nextMode(input: {
  current: TimerMode
  completedFocusCount: number
  longBreakInterval: number
}): TimerMode {
  if (input.current !== 'focus') return 'focus'
  const interval = Math.max(2, input.longBreakInterval)
  return input.completedFocusCount % interval === 0 ? 'long_break' : 'short_break'
}

export function progressPercent(durationSeconds: number, remaining: number): number {
  if (durationSeconds <= 0) return 0
  return Math.min(100, Math.max(0, ((durationSeconds - remaining) / durationSeconds) * 100))
}

export function focusSecondsOf(state: Pick<TimerState, 'mode' | 'durationSeconds' | 'status' | 'remainingSeconds' | 'endsAt'>): number {
  if (state.mode !== 'focus') return 0
  const remaining = remainingSeconds(state)
  return Math.max(0, state.durationSeconds - remaining)
}
