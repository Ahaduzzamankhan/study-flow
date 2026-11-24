/**
 * Development-only bridge.
 *
 * `vite` alone has no Electron main process, so the renderer would otherwise be
 * unusable in a browser. This adapter implements the same channels with the
 * same pure calculation helpers (shared/stats) backed by localStorage, which
 * makes the UI reviewable in a browser during development. It is excluded from
 * production behaviour: a packaged build always talks to the real IPC bridge.
 */
import type { Bridge } from './api'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { evaluateAchievements, newlyUnlocked, type AchievementSnapshot } from '@shared/achievements'
import {
  addDays,
  computeLongestStreak,
  computeStreak,
  computeXp,
  dateKey,
  goalWindow,
  groupSecondsByDay,
  habitCompletionRate,
  habitStreak,
  isStudySession,
  levelFromXp,
  startOfMonthKey,
  startOfWeekKey,
  todayKey,
} from '@shared/stats'
import type {
  AchievementState,
  AnalyticsSummary,
  AppSettings,
  Chapter,
  DayTotal,
  Goal,
  GoalProgress,
  Habit,
  HabitCompletion,
  HabitWithHistory,
  Note,
  OverviewStats,
  StudySchedule,
  StudySession,
  Subject,
  SubjectTotal,
  Task,
  TimerState,
} from '@shared/types'

const STORAGE_KEY = 'studyflow-dev-bridge-v1'

interface Store {
  subjects: Subject[]
  chapters: Chapter[]
  sessions: StudySession[]
  tasks: Task[]
  goals: Goal[]
  habits: Habit[]
  completions: HabitCompletion[]
  notes: Note[]
  schedules: StudySchedule[]
  settings: AppSettings
  timer: TimerState
  achievements: Record<string, string>
}

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)

const nowIso = (): string => new Date().toISOString()

const idleTimer = (): TimerState => ({
  mode: 'focus',
  status: 'idle',
  startedAt: null,
  endsAt: null,
  durationSeconds: 0,
  remainingSeconds: 0,
  completedFocusCount: 0,
  subjectId: null,
  taskId: null,
  updatedAt: new Date(0).toISOString(),
})

function emptyStore(): Store {
  return {
    subjects: [],
    chapters: [],
    sessions: [],
    tasks: [],
    goals: [],
    habits: [],
    completions: [],
    notes: [],
    schedules: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    timer: idleTimer(),
    achievements: {},
  }
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<Store>
    return { ...emptyStore(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}), timer: { ...DEFAULT_SETTINGS.timer, ...(parsed.settings?.timer ?? {}) } } }
  } catch {
    return emptyStore()
  }
}

export function createDevBridge(): Bridge {
  let store = load()
  const persist = (): void => localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  const study = (): StudySession[] => store.sessions.filter(isStudySession)

  const overview = (): OverviewStats => {
    const sessions = study()
    const days = [...new Set(sessions.map((s) => dateKey(s.startTime)))]
    const today = todayKey()
    const weekStart = startOfWeekKey(today)
    const monthStart = startOfMonthKey(today)
    const totals = groupSecondsByDay(sessions)
    const todaySeconds = totals[today] ?? 0
    const sumBetween = (from: string): number =>
      Object.entries(totals)
        .filter(([key]) => key >= from && key <= today)
        .reduce((sum, [, value]) => sum + value, 0)
    const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
    const goalMinutes = store.goals.find((g) => g.type === 'daily_minutes' && !g.archived)?.targetValue ?? 0
    const xp = computeXp({ focusSeconds: totalSeconds, totalSessions: sessions.length, achievements: Object.keys(store.achievements).length })
    return {
      todaySeconds,
      todaySessions: sessions.filter((s) => dateKey(s.startTime) === today).length,
      streak: computeStreak(days),
      longestStreak: computeLongestStreak(days),
      weekSeconds: sumBetween(weekStart),
      monthSeconds: sumBetween(monthStart),
      totalSeconds,
      totalSessions: sessions.length,
      completedTasks: store.tasks.filter((t) => t.status === 'done').length,
      openTasks: store.tasks.filter((t) => t.status !== 'done').length,
      goalCompletion: goalMinutes > 0 ? Math.min(100, Math.round((todaySeconds / (goalMinutes * 60)) * 100)) : 0,
      todayGoalMinutes: goalMinutes,
      focusSeconds: store.sessions.filter((s) => s.type === 'focus').reduce((sum, s) => sum + s.durationSeconds, 0),
      breakSeconds: store.sessions
        .filter((s) => s.type === 'short_break' || s.type === 'long_break')
        .reduce((sum, s) => sum + s.durationSeconds, 0),
      subjectCount: store.subjects.length,
      noteCount: store.notes.length,
      level: levelFromXp(xp),
    }
  }

  const analytics = (): AnalyticsSummary => {
    const all = store.sessions
    const sessions = all.filter(isStudySession)
    const totals = groupSecondsByDay(sessions)
    const dayKeys = Object.keys(totals).sort()
    const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
    const bySubject = new Map<string, SubjectTotal>()
    for (const subject of store.subjects) {
      bySubject.set(subject.id, { subjectId: subject.id, name: subject.name, color: subject.color, seconds: 0, sessions: 0 })
    }
    for (const session of sessions) {
      if (!session.subjectId) continue
      const entry = bySubject.get(session.subjectId)
      if (!entry) continue
      entry.seconds += session.durationSeconds
      entry.sessions += 1
    }
    const subjects = [...bySubject.values()].sort((a, b) => b.seconds - a.seconds)
    const bestDay = dayKeys.reduce<DayTotal | null>((best, key) => {
      const seconds = totals[key] ?? 0
      return !best || seconds > best.seconds ? { date: key, seconds, sessions: 0 } : best
    }, null)
    return {
      totalSeconds,
      dailyAverage: dayKeys.length ? Math.round(totalSeconds / dayKeys.length) : 0,
      weeklyAverage: Math.round(totalSeconds / Math.max(1, Math.ceil(dayKeys.length / 7))),
      monthlyAverage: Math.round(totalSeconds / Math.max(1, new Set(dayKeys.map((k) => k.slice(0, 7))).size)),
      longestSessionSeconds: sessions.reduce((max, s) => Math.max(max, s.durationSeconds), 0),
      mostStudiedSubject: subjects[0] ?? null,
      mostProductiveDay: bestDay,
      completionRate: all.length ? Math.round((all.filter((s) => s.completed).length / all.length) * 100) : 0,
      focusSeconds: all.filter((s) => s.type === 'focus').reduce((sum, s) => sum + s.durationSeconds, 0),
      breakSeconds: all
        .filter((s) => s.type === 'short_break' || s.type === 'long_break')
        .reduce((sum, s) => sum + s.durationSeconds, 0),
      activeDays: dayKeys.length,
      streakHistory: dayKeys.slice(-90).map((key) => ({ date: key, seconds: totals[key] ?? 0 })),
    }
  }

  const goalProgress = (): GoalProgress[] => {
    const sessions = study()
    const completedChapters = store.chapters.filter((c) => c.status === 'completed').length
    return store.goals
      .filter((g) => !g.archived)
      .map((goal) => {
        let current = 0
        let periodLabel = 'All time'
        if (goal.type === 'daily_minutes' || goal.type === 'weekly_minutes' || goal.type === 'monthly_minutes') {
          const window = goalWindow(goal.type)
          current = Math.round(
            sessions
              .filter((s) => dateKey(s.startTime) >= window.from && dateKey(s.startTime) <= window.to)
              .reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
          )
          periodLabel = window.label
        } else if (goal.type === 'subject_minutes') {
          current = Math.round(
            sessions.filter((s) => s.subjectId === goal.subjectId).reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
          )
        } else if (goal.type === 'session_count') {
          current = sessions.length
        } else {
          current = completedChapters
          periodLabel = 'All chapters'
        }
        const target = Math.max(1, goal.targetValue)
        return {
          goal,
          current,
          target,
          percent: Math.min(100, Math.round((current / target) * 100)),
          periodLabel,
          subjectName: store.subjects.find((s) => s.id === goal.subjectId)?.name ?? null,
        }
      })
  }

  const habits = (): HabitWithHistory[] =>
    store.habits
      .filter((h) => !h.archived)
      .map((habit) => {
        const dates = store.completions.filter((c) => c.habitId === habit.id).map((c) => c.date)
        return {
          ...habit,
          completions: dates,
          streak: habitStreak(dates),
          completionRate: habitCompletionRate(dates, 30),
        }
      })

  const achievementSnapshot = (): AchievementSnapshot => {
    const sessions = study()
    const days = [...new Set(sessions.map((s) => dateKey(s.startTime)))]
    const focusSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
    const goalMinutes = store.goals.find((g) => g.type === 'daily_minutes' && !g.archived)?.targetValue ?? 0
    const todaySeconds = sessions
      .filter((s) => dateKey(s.startTime) === todayKey())
      .reduce((sum, s) => sum + s.durationSeconds, 0)
    const xp = computeXp({ focusSeconds, totalSessions: sessions.length, achievements: Object.keys(store.achievements).length })
    return {
      totalSessions: sessions.length,
      focusSeconds,
      streak: computeStreak(days),
      longestStreak: computeLongestStreak(days),
      todayGoalMet: goalMinutes > 0 && todaySeconds >= goalMinutes * 60,
      subjectsWithAllChapters: store.subjects.filter((subject) => {
        const own = store.chapters.filter((c) => c.subjectId === subject.id)
        return own.length > 0 && own.every((c) => c.status === 'completed')
      }).length,
      level: levelFromXp(xp).level,
    }
  }

  const achievements = (): AchievementState[] => {
    const states = evaluateAchievements(achievementSnapshot(), store.achievements)
    const unlocked = newlyUnlocked(states, new Set(Object.keys(store.achievements)))
    if (unlocked.length > 0) {
      const stamp = nowIso()
      for (const item of unlocked) store.achievements[item.key] = stamp
      persist()
      return evaluateAchievements(achievementSnapshot(), store.achievements)
    }
    return states
  }

  const ensureSubject = (id: string | null): string | null => (id && store.subjects.some((s) => s.id === id) ? id : null)

  const handle = (channel: string, payload: Record<string, unknown>): unknown => {
    const args = payload ?? {}
    const id = typeof args.id === 'string' ? args.id : ''
    const patch = (args.patch ?? {}) as Record<string, unknown>
    switch (channel) {
      case 'app.info':
        return {
          name: 'StudyFlow',
          version: '1.0.0',
          platform: 'browser-dev',
          databasePath: 'localStorage (development preview)',
          userDataPath: 'localStorage',
          electron: 'n/a',
          chrome: navigator.userAgent,
          node: 'n/a',
          repositoryUrl: 'https://github.com/Ahaduzzamankhan/study-flow',
        }
      case 'app.openExternal':
        window.open(String(args.url), '_blank', 'noopener')
        return true
      case 'app.checkUpdates':
        return { current: '1.0.0', latest: null, updateAvailable: false, releasesUrl: 'https://github.com/Ahaduzzamankhan/study-flow/releases' }
      case 'app.setLaunchAtStartup':
      case 'window.setFullScreen':
        return true
      case 'notify.show':
        return true

      case 'settings.get':
        return store.settings
      case 'settings.update':
        store.settings = { ...store.settings, ...(patch as Partial<AppSettings>), timer: { ...store.settings.timer, ...((patch.timer as AppSettings['timer']) ?? {}) } }
        persist()
        return store.settings

      case 'subjects.list':
        return [...store.subjects].sort((a, b) => a.name.localeCompare(b.name))
      case 'subjects.create': {
        const stamp = nowIso()
        const subject: Subject = { ...(args as unknown as Subject), id: uid(), createdAt: stamp, updatedAt: stamp }
        store.subjects.push(subject)
        persist()
        return subject
      }
      case 'subjects.update': {
        const subject = store.subjects.find((s) => s.id === id)
        if (!subject) throw new Error('Subject not found')
        Object.assign(subject, patch, { updatedAt: nowIso() })
        persist()
        return subject
      }
      case 'subjects.remove':
        store.subjects = store.subjects.filter((s) => s.id !== id)
        store.chapters = store.chapters.filter((c) => c.subjectId !== id)
        persist()
        return true

      case 'chapters.list': {
        const subjectId = args.subjectId as string | null
        return store.chapters.filter((c) => !subjectId || c.subjectId === subjectId).sort((a, b) => a.position - b.position)
      }
      case 'chapters.create': {
        const chapter: Chapter = {
          id: uid(),
          subjectId: String(args.subjectId),
          title: String(args.title),
          status: (args.status as Chapter['status']) ?? 'pending',
          position: store.chapters.filter((c) => c.subjectId === args.subjectId).length,
          createdAt: nowIso(),
        }
        store.chapters.push(chapter)
        persist()
        return chapter
      }
      case 'chapters.update': {
        const chapter = store.chapters.find((c) => c.id === id)
        if (!chapter) throw new Error('Chapter not found')
        Object.assign(chapter, patch)
        persist()
        return chapter
      }
      case 'chapters.remove':
        store.chapters = store.chapters.filter((c) => c.id !== id)
        persist()
        return true

      case 'sessions.list': {
        const { from, to, subjectId, search, limit } = args as {
          from?: string
          to?: string
          subjectId?: string
          search?: string
          limit?: number
        }
        let rows = [...store.sessions].sort((a, b) => b.startTime.localeCompare(a.startTime))
        if (from) rows = rows.filter((s) => s.startTime >= from)
        if (to) rows = rows.filter((s) => s.startTime <= to)
        if (subjectId) rows = rows.filter((s) => s.subjectId === subjectId)
        if (search) rows = rows.filter((s) => `${s.topic} ${s.notes}`.toLowerCase().includes(search.toLowerCase()))
        return limit ? rows.slice(0, limit) : rows
      }
      case 'sessions.create': {
        const duplicate = store.sessions.find(
          (s) => s.startTime === args.startTime && s.type === args.type && s.durationSeconds === args.durationSeconds,
        )
        if (duplicate) return duplicate
        const session: StudySession = {
          ...(args as unknown as StudySession),
          subjectId: ensureSubject((args.subjectId as string | null) ?? null),
          id: uid(),
          createdAt: nowIso(),
        }
        store.sessions.push(session)
        persist()
        return session
      }
      case 'sessions.update': {
        const session = store.sessions.find((s) => s.id === id)
        if (!session) throw new Error('Session not found')
        Object.assign(session, patch)
        persist()
        return session
      }
      case 'sessions.remove':
        store.sessions = store.sessions.filter((s) => s.id !== id)
        persist()
        return true

      case 'tasks.list':
        return [...store.tasks].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      case 'tasks.create': {
        const task: Task = {
          ...(args as unknown as Task),
          id: uid(),
          createdAt: nowIso(),
          completedAt: args.status === 'done' ? nowIso() : null,
        }
        store.tasks.push(task)
        persist()
        return task
      }
      case 'tasks.update': {
        const task = store.tasks.find((t) => t.id === id)
        if (!task) throw new Error('Task not found')
        Object.assign(task, patch)
        task.completedAt = task.status === 'done' ? nowIso() : null
        persist()
        return task
      }
      case 'tasks.remove':
        store.tasks = store.tasks.filter((t) => t.id !== id)
        persist()
        return true

      case 'goals.list':
        return store.goals
      case 'goals.create': {
        const goal: Goal = {
          id: uid(),
          type: args.type as Goal['type'],
          targetValue: Number(args.targetValue),
          subjectId: (args.subjectId as string | null) ?? null,
          createdAt: nowIso(),
          archived: false,
        }
        store.goals.push(goal)
        persist()
        return goal
      }
      case 'goals.update': {
        const goal = store.goals.find((g) => g.id === id)
        if (!goal) throw new Error('Goal not found')
        Object.assign(goal, patch)
        persist()
        return goal
      }
      case 'goals.remove':
        store.goals = store.goals.filter((g) => g.id !== id)
        persist()
        return true

      case 'habits.list':
        return store.habits.filter((h) => !h.archived)
      case 'habits.create': {
        const habit: Habit = { ...(args as unknown as Habit), id: uid(), archived: false, createdAt: nowIso() }
        store.habits.push(habit)
        persist()
        return habit
      }
      case 'habits.update': {
        const habit = store.habits.find((h) => h.id === id)
        if (!habit) throw new Error('Habit not found')
        Object.assign(habit, patch)
        persist()
        return habit
      }
      case 'habits.remove': {
        const habit = store.habits.find((h) => h.id === id)
        if (habit) habit.archived = true
        persist()
        return true
      }
      case 'habits.toggle': {
        const habitId = String(args.habitId)
        const date = String(args.date)
        const existing = store.completions.find((c) => c.habitId === habitId && c.date === date)
        if (existing) {
          store.completions = store.completions.filter((c) => c.id !== existing.id)
          persist()
          return { completed: false }
        }
        store.completions.push({ id: uid(), habitId, date, createdAt: nowIso() })
        persist()
        return { completed: true }
      }

      case 'notes.list':
        return [...store.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
      case 'notes.create': {
        const stamp = nowIso()
        const note: Note = { ...(args as unknown as Note), id: uid(), createdAt: stamp, updatedAt: stamp }
        store.notes.push(note)
        persist()
        return note
      }
      case 'notes.update': {
        const note = store.notes.find((n) => n.id === id)
        if (!note) throw new Error('Note not found')
        Object.assign(note, patch, { updatedAt: nowIso() })
        persist()
        return note
      }
      case 'notes.remove':
        store.notes = store.notes.filter((n) => n.id !== id)
        persist()
        return true

      case 'schedules.list':
        return store.schedules.filter((s) => s.date >= String(args.from) && s.date <= String(args.to))
      case 'schedules.create': {
        const schedule: StudySchedule = { ...(args as unknown as StudySchedule), id: uid(), createdAt: nowIso() }
        store.schedules.push(schedule)
        persist()
        return schedule
      }
      case 'schedules.update': {
        const schedule = store.schedules.find((s) => s.id === id)
        if (!schedule) throw new Error('Schedule not found')
        Object.assign(schedule, patch)
        persist()
        return schedule
      }
      case 'schedules.remove':
        store.schedules = store.schedules.filter((s) => s.id !== id)
        persist()
        return true

      case 'timer.get':
        return store.timer
      case 'timer.save':
        store.timer = args.state as TimerState
        persist()
        return store.timer
      case 'timer.clear':
        store.timer = idleTimer()
        persist()
        return true

      case 'stats.overview':
        return overview()
      case 'stats.heatmap': {
        const rows = store.sessions.filter((s) => {
          const key = dateKey(s.startTime)
          return key >= String(args.from) && key <= String(args.to)
        })
        return groupSecondsByDay(rows)
      }
      case 'stats.daily': {
        const from = String(args.from)
        const to = String(args.to)
        const totals = groupSecondsByDay(store.sessions)
        const out: DayTotal[] = []
        let cursor = from
        let guard = 0
        while (cursor <= to && guard < 1000) {
          out.push({ date: cursor, seconds: totals[cursor] ?? 0, sessions: 0 })
          cursor = addDays(cursor, 1)
          guard += 1
        }
        return out
      }
      case 'stats.analytics':
        return analytics()
      case 'stats.subjects': {
        const map = new Map<string, SubjectTotal>(
          store.subjects.map((s) => [s.id, { subjectId: s.id, name: s.name, color: s.color, seconds: 0, sessions: 0 }]),
        )
        for (const session of study()) {
          if (!session.subjectId) continue
          const entry = map.get(session.subjectId)
          if (!entry) continue
          entry.seconds += session.durationSeconds
          entry.sessions += 1
        }
        return [...map.values()].sort((a, b) => b.seconds - a.seconds)
      }
      case 'stats.goals':
        return goalProgress()
      case 'stats.habits':
        return habits()
      case 'stats.achievements':
        return achievements()

      case 'data.export': {
        if (args.format === 'csv') {
          const header = 'date,start_time,duration_minutes,type,subject,topic,completed\n'
          const rows = store.sessions
            .map((s) =>
              [
                s.startTime.slice(0, 10),
                s.startTime,
                (s.durationSeconds / 60).toFixed(2),
                s.type,
                store.subjects.find((x) => x.id === s.subjectId)?.name ?? '',
                s.topic.replace(/,/g, ' '),
                s.completed ? 'yes' : 'no',
              ].join(','),
            )
            .join('\n')
          const blob = new Blob([header + rows], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'studyflow-sessions.csv'
          link.click()
          URL.revokeObjectURL(url)
          return { canceled: false, path: 'studyflow-sessions.csv', rows: store.sessions.length }
        }
        localStorage.setItem('studyflow-dev-export.json', JSON.stringify(store, null, 2))
        return { canceled: false, path: 'studyflow-dev-export.json', rows: 1 }
      }
      case 'data.backup':
      case 'data.restore':
        throw new Error('Backups are handled by the Electron main process. Use the installed desktop app for this action.')
      case 'data.clear':
        store = emptyStore()
        persist()
        return { cleared: true }
      default:
        throw new Error(`Unsupported channel in development preview: ${channel}`)
    }
  }

  return {
    platform: 'browser-dev',
    invoke: async (channel: string, payload?: unknown) => handle(channel, (payload ?? {}) as Record<string, unknown>),
    onMenuAction: () => () => undefined,
    onWindowState: () => () => undefined,
  }
}
