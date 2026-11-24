import { describe, expect, it } from 'vitest'
import { CHANNELS, channelSchemas, isChannel, validatePayload } from '../shared/contract'
import { evaluateAchievements, newlyUnlocked } from '../shared/achievements'

describe('IPC channel contract', () => {
  it('exposes a channel for every renderer capability', () => {
    expect(CHANNELS.length).toBeGreaterThan(40)
    expect(isChannel('subjects.list')).toBe(true)
    expect(isChannel('danger.execute')).toBe(false)
  })

  it('rejects unknown channels through the guard', () => {
    expect(isChannel('__proto__')).toBe(false)
    expect(isChannel('constructor')).toBe(false)
  })

  it('accepts a valid create payload', () => {
    const payload = validatePayload('subjects.create', {
      name: 'Biology',
      color: '#8B7CF6',
      icon: 'leaf',
      description: '',
      targetHours: 12,
    })
    expect(payload.name).toBe('Biology')
  })

  it('rejects malformed payloads', () => {
    expect(() => validatePayload('subjects.create', { name: '', color: 'red', icon: 'leaf', description: '', targetHours: 1 })).toThrow()
    expect(() => validatePayload('subjects.create', { name: 'ok', color: '#ffffff', icon: 'leaf', description: '', targetHours: -5 })).toThrow()
    expect(() => validatePayload('app.openExternal', { url: 'http://evil.example' })).toThrow()
    expect(() => validatePayload('app.openExternal', { url: 'https://example.com' })).not.toThrow()
  })

  it('bounds session durations and requires ISO timestamps', () => {
    const base = {
      subjectId: null,
      chapterId: null,
      topic: 'Reading',
      type: 'focus',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: 1500,
      notes: '',
      completed: true,
    }
    expect(() => validatePayload('sessions.create', base)).not.toThrow()
    expect(() => validatePayload('sessions.create', { ...base, durationSeconds: -1 })).toThrow()
    expect(() => validatePayload('sessions.create', { ...base, durationSeconds: 999_999 })).toThrow()
  })

  it('requires an explicit confirmation for destructive data actions', () => {
    expect(() => validatePayload('data.clear', { confirm: false })).toThrow()
    expect(() => validatePayload('data.clear', {})).toThrow()
    expect(() => validatePayload('data.clear', { confirm: true })).not.toThrow()
  })

  it('keeps every schema key aligned with the channel list', () => {
    for (const channel of CHANNELS) {
      expect(channelSchemas[channel]).toBeTruthy()
    }
  })
})

describe('achievement evaluation', () => {
  it('unlocks only thresholds that are met', () => {
    const states = evaluateAchievements(
      {
        totalSessions: 10,
        focusSeconds: 5 * 3600,
        streak: 7,
        longestStreak: 7,
        todayGoalMet: false,
        subjectsWithAllChapters: 0,
        level: 2,
      },
      {},
    )
    const unlocked = new Set(states.filter((state) => state.progress >= state.target).map((state) => state.key))
    expect(unlocked.has('first_session')).toBe(true)
    expect(unlocked.has('five_hours')).toBe(true)
    expect(unlocked.has('ten_sessions')).toBe(true)
    expect(unlocked.has('streak_7')).toBe(true)
    expect(unlocked.has('focus_100h')).toBe(false)
    expect(newlyUnlocked(states, new Set(['first_session'])).some((state) => state.key === 'first_session')).toBe(false)
  })
})
