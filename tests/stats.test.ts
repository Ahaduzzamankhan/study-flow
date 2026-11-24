import { describe, expect, it } from 'vitest'
import {
  addDays,
  computeLongestStreak,
  computeStreak,
  computeXp,
  dateKey,
  formatDuration,
  goalWindow,
  groupSecondsByDay,
  habitCompletionRate,
  habitStreak,
  levelFromXp,
  startOfMonthKey,
  startOfWeekKey,
  studySeconds,
  todayKey,
} from '../shared/stats'

const NOW = new Date(2026, 4, 20, 10, 0, 0) // 2026-05-20 local time

describe('date helpers', () => {
  it('creates local date keys', () => {
    expect(dateKey(NOW)).toBe('2026-05-20')
    expect(addDays('2026-05-20', -1)).toBe('2026-05-19')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(startOfWeekKey('2026-05-20')).toBe('2026-05-18')
    expect(startOfMonthKey('2026-05-20')).toBe('2026-05-01')
    expect(todayKey(NOW)).toBe('2026-05-20')
  })
})

describe('streaks', () => {
  it('counts a streak that ends today', () => {
    expect(computeStreak(['2026-05-18', '2026-05-19', '2026-05-20'], NOW)).toBe(3)
  })

  it('keeps the streak alive when today has no session yet', () => {
    expect(computeStreak(['2026-05-18', '2026-05-19'], NOW)).toBe(2)
  })

  it('breaks on a missed day', () => {
    expect(computeStreak(['2026-05-15', '2026-05-16'], NOW)).toBe(0)
  })

  it('finds the longest historical streak', () => {
    expect(computeLongestStreak(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-10'])).toBe(3)
    expect(computeLongestStreak([])).toBe(0)
  })
})

describe('study duration aggregation', () => {
  const sessions = [
    { type: 'focus' as const, durationSeconds: 1500, startTime: new Date(2026, 4, 20, 9, 0).toISOString() },
    { type: 'manual' as const, durationSeconds: 900, startTime: new Date(2026, 4, 20, 14, 0).toISOString() },
    { type: 'short_break' as const, durationSeconds: 300, startTime: new Date(2026, 4, 20, 10, 0).toISOString() },
  ]

  it('never counts break time as study time', () => {
    expect(studySeconds(sessions)).toBe(2400)
    expect(groupSecondsByDay(sessions)).toEqual({ '2026-05-20': 2400 })
  })

  it('formats durations for the UI', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(90)).toBe('1m')
    expect(formatDuration(3600)).toBe('1h')
    expect(formatDuration(5400)).toBe('1h 30m')
  })
})

describe('habits', () => {
  it('computes habit streaks and rolling completion rate', () => {
    const dates = ['2026-05-20', '2026-05-19', '2026-05-18']
    expect(habitStreak(dates, NOW)).toBe(3)
    expect(habitCompletionRate(dates, 30, NOW)).toBe(10)
  })
})

describe('goals and levels', () => {
  it('uses calendar windows for goal periods', () => {
    expect(goalWindow('daily_minutes', NOW)).toMatchObject({ from: '2026-05-20', to: '2026-05-20' })
    expect(goalWindow('weekly_minutes', NOW)).toMatchObject({ from: '2026-05-18', to: '2026-05-24' })
    expect(goalWindow('monthly_minutes', NOW).from).toBe('2026-05-01')
  })

  it('converts XP into a levelling curve', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(400).level).toBe(3)
    expect(levelFromXp(-50).xp).toBe(0)
    expect(computeXp({ focusSeconds: 6000, totalSessions: 4, achievements: 1 })).toBe(190)
  })
})
