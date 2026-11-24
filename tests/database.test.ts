import { describe, expect, it, beforeEach } from 'vitest'
import { createTestDatabase, type DB } from '../electron/database'
import {
  createChapter,
  createGoal,
  createHabit,
  createNote,
  createSession,
  createSubject,
  createTask,
  deleteSubject,
  getSettings,
  getTimerState,
  listAchievementRows,
  listHabitCompletions,
  listSessions,
  saveTimerState,
  toggleHabitCompletion,
  updateSettings,
  updateTask,
  unlockAchievements,
} from '../electron/database/repositories'
import { achievementsState, goalProgress, habitsWithHistory, overview, subjectTotals } from '../electron/database/stats'
import { runMigrations, currentVersion } from '../electron/database/migrations'

let db: DB

beforeEach(() => {
  db = createTestDatabase()
})

const iso = (offsetMinutes = 0): string => new Date(Date.now() + offsetMinutes * 60_000).toISOString()

describe('database migrations', () => {
  it('creates the schema once and records the version', () => {
    expect(currentVersion(db)).toBeGreaterThan(0)
    expect(runMigrations(db)).toBe(0)
  })

  it('enables foreign keys', () => {
    const row = db.pragma('foreign_keys', { simple: true }) as number
    expect(row).toBe(1)
  })
})

describe('subjects and chapters', () => {
  it('cascades chapters when a subject is deleted', () => {
    const subject = createSubject(db, { name: 'Physics', color: '#8B7CF6', icon: 'atom', description: '', targetHours: 10 })
    createChapter(db, { subjectId: subject.id, title: 'Kinematics', status: 'pending' })
    expect(db.prepare('SELECT COUNT(*) AS total FROM chapters').get()).toEqual({ total: 1 })
    deleteSubject(db, subject.id)
    expect(db.prepare('SELECT COUNT(*) AS total FROM chapters').get()).toEqual({ total: 0 })
  })
})

describe('sessions', () => {
  it('stores sessions and prevents accidental duplicates', () => {
    const subject = createSubject(db, { name: 'Maths', color: '#8B7CF6', icon: 'calculator', description: '', targetHours: 20 })
    const startTime = iso(-30)
    const payload = {
      subjectId: subject.id,
      chapterId: null,
      topic: 'Integrals',
      type: 'focus' as const,
      startTime,
      endTime: iso(),
      durationSeconds: 1800,
      notes: '',
      completed: true,
    }
    const first = createSession(db, payload)
    const second = createSession(db, payload)
    expect(second.id).toBe(first.id)
    expect(listSessions(db)).toHaveLength(1)
  })

  it('excludes break time from study totals', () => {
    createSession(db, {
      subjectId: null,
      chapterId: null,
      topic: 'Focus',
      type: 'focus',
      startTime: iso(-60),
      endTime: iso(-30),
      durationSeconds: 1800,
      notes: '',
      completed: true,
    })
    createSession(db, {
      subjectId: null,
      chapterId: null,
      topic: 'Break',
      type: 'short_break',
      startTime: iso(-30),
      endTime: iso(-25),
      durationSeconds: 300,
      notes: '',
      completed: true,
    })
    const stats = overview(db)
    expect(stats.todaySeconds).toBe(1800)
    expect(stats.totalSessions).toBe(1)
    expect(stats.breakSeconds).toBe(300)
  })
})

describe('tasks, goals and habits', () => {
  it('stamps completion when a task is marked done', () => {
    const task = createTask(db, {
      title: 'Read chapter 2',
      description: '',
      subjectId: null,
      chapterId: null,
      priority: 'high',
      dueDate: null,
      estimatedMinutes: 30,
      status: 'todo',
      notes: '',
    })
    const done = updateTask(db, task.id, { status: 'done' })
    expect(done?.completedAt).toBeTruthy()
    const reopened = updateTask(db, task.id, { status: 'todo' })
    expect(reopened?.completedAt).toBeNull()
  })

  it('measures daily goals from focus time only', () => {
    createGoal(db, { type: 'daily_minutes', targetValue: 60, subjectId: null })
    createSession(db, {
      subjectId: null,
      chapterId: null,
      topic: 'Focus',
      type: 'focus',
      startTime: iso(-40),
      endTime: iso(-10),
      durationSeconds: 1800,
      notes: '',
      completed: true,
    })
    const [progress] = goalProgress(db)
    expect(progress?.current).toBe(30)
    expect(progress?.percent).toBe(50)
    expect(progress?.periodLabel).toBe('Today')
  })

  it('toggles habit completions without duplicating them', () => {
    const habit = createHabit(db, { name: 'Revise', description: '', color: '#8B7CF6', icon: 'repeat' })
    const date = new Date().toISOString().slice(0, 10)
    expect(toggleHabitCompletion(db, habit.id, date)).toBe(true)
    expect(toggleHabitCompletion(db, habit.id, date)).toBe(false)
    expect(listHabitCompletions(db, date)).toHaveLength(0)
    toggleHabitCompletion(db, habit.id, date)
    expect(habitsWithHistory(db)[0]?.streak).toBe(1)
  })
})

describe('settings and timer state', () => {
  it('merges partial settings with defaults', () => {
    const updated = updateSettings(db, { theme: 'dark', timer: { ...getSettings(db).timer, focusMinutes: 50 } })
    expect(updated.theme).toBe('dark')
    expect(updated.timer.focusMinutes).toBe(50)
    expect(updated.timer.shortBreakMinutes).toBe(5)
    expect(getSettings(db).theme).toBe('dark')
  })

  it('persists the active timer state', () => {
    const endsAt = new Date(Date.now() + 60_000).toISOString()
    saveTimerState(db, {
      mode: 'focus',
      status: 'running',
      startedAt: new Date().toISOString(),
      endsAt,
      durationSeconds: 1500,
      remainingSeconds: 1500,
      completedFocusCount: 2,
      subjectId: null,
      taskId: null,
      updatedAt: new Date().toISOString(),
    })
    const state = getTimerState(db)
    expect(state.status).toBe('running')
    expect(state.completedFocusCount).toBe(2)
  })
})

describe('notes and achievements', () => {
  it('stores notes with pin ordering', () => {
    createNote(db, { title: 'Formula sheet', content: 'E = mc^2', subjectId: null, pinned: true })
    createNote(db, { title: 'Scratch', content: '', subjectId: null, pinned: false })
    const notes = db.prepare('SELECT title FROM notes ORDER BY pinned DESC').all() as { title: string }[]
    expect(notes[0]?.title).toBe('Formula sheet')
  })

  it('unlocks achievements once and reports progress', () => {
    createSession(db, {
      subjectId: null,
      chapterId: null,
      topic: 'First',
      type: 'focus',
      startTime: iso(-25),
      endTime: iso(),
      durationSeconds: 1500,
      notes: '',
      completed: true,
    })
    const states = achievementsState(db)
    const first = states.find((state) => state.key === 'first_session')
    expect(first?.unlockedAt).toBeTruthy()
    const unlockedAgain = unlockAchievements(db, ['first_session'])
    expect(unlockedAgain).toHaveLength(0)
    expect(listAchievementRows(db).length).toBeGreaterThan(0)
  })

  it('aggregates per-subject totals', () => {
    const subject = createSubject(db, { name: 'Chemistry', color: '#6FD3B6', icon: 'flask', description: '', targetHours: 0 })
    createSession(db, {
      subjectId: subject.id,
      chapterId: null,
      topic: 'Titration',
      type: 'focus',
      startTime: iso(-50),
      endTime: iso(-20),
      durationSeconds: 1800,
      notes: '',
      completed: true,
    })
    expect(subjectTotals(db)[0]).toMatchObject({ name: 'Chemistry', seconds: 1800, sessions: 1 })
  })
})
