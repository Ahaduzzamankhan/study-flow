import { describe, expect, it } from 'vitest'
import { durationForMode, formatClock, isExpired, nextMode, progressPercent, remainingSeconds } from '../src/lib/timer'

describe('timer calculations', () => {
  it('derives remaining time from timestamps, not from ticks', () => {
    const now = Date.now()
    const state = { status: 'running' as const, endsAt: new Date(now + 90_000).toISOString(), remainingSeconds: 600 }
    expect(remainingSeconds(state, now)).toBe(90)
    // Any later wall-clock read stays accurate even if no tick happened.
    expect(remainingSeconds(state, now + 60_000)).toBe(30)
  })

  it('never returns a negative remaining time', () => {
    const now = Date.now()
    const state = { status: 'running' as const, endsAt: new Date(now - 5_000).toISOString(), remainingSeconds: 5 }
    expect(remainingSeconds(state, now)).toBe(0)
    expect(isExpired(state, now)).toBe(true)
  })

  it('uses the stored remaining time while paused', () => {
    const state = { status: 'paused' as const, endsAt: null, remainingSeconds: 321 }
    expect(remainingSeconds(state)).toBe(321)
    expect(isExpired(state)).toBe(false)
  })

  it('maps durations to the configured settings', () => {
    const settings = { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }
    expect(durationForMode('focus', settings)).toBe(1500)
    expect(durationForMode('short_break', settings)).toBe(300)
    expect(durationForMode('long_break', settings)).toBe(900)
  })

  it('schedules a long break only every configured interval', () => {
    expect(nextMode({ current: 'focus', completedFocusCount: 1, longBreakInterval: 4 })).toBe('short_break')
    expect(nextMode({ current: 'focus', completedFocusCount: 4, longBreakInterval: 4 })).toBe('long_break')
    expect(nextMode({ current: 'focus', completedFocusCount: 8, longBreakInterval: 4 })).toBe('long_break')
    expect(nextMode({ current: 'short_break', completedFocusCount: 4, longBreakInterval: 4 })).toBe('focus')
  })

  it('formats a clock and clamps progress', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65)).toBe('01:05')
    expect(formatClock(3661)).toBe('1:01:01')
    expect(progressPercent(100, 50)).toBe(50)
    expect(progressPercent(100, 150)).toBe(0)
    expect(progressPercent(0, 0)).toBe(0)
  })
})
