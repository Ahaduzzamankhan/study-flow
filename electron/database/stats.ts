import type { DB } from './index'
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
  isStudySession,
  levelFromXp,
  startOfMonthKey,
  startOfWeekKey,
  todayKey,
} from '../../shared/stats'
import { evaluateAchievements, newlyUnlocked, type AchievementSnapshot } from '../../shared/achievements'
import type {
  AchievementState,
  AnalyticsSummary,
  DayTotal,
  GoalProgress,
  HabitWithHistory,
  OverviewStats,
  StudySession,
  SubjectTotal,
} from '../../shared/types'
import {
  listAchievementRows,
  listChapters,
  listGoals,
  listHabitCompletions,
  listHabits,
  listNotes,
  listSessions,
  listSubjects,
  listTasks,
  unlockAchievements,
} from './repositories'

export function localStartIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).toISOString()
}

export function localEndIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999).toISOString()
}

function studySessions(db: DB): StudySession[] {
  return listSessions(db).filter(isStudySession)
}

export function dailyTotals(db: DB, from: string, to: string): DayTotal[] {
  const rows = listSessions(db, { from: localStartIso(from), to: localEndIso(to), limit: 5000 })
  const seconds = groupSecondsByDay(rows)
  const counts: Record<string, number> = {}
  for (const row of rows) {
    if (!isStudySession(row)) continue
    const key = dateKey(row.startTime)
    counts[key] = (counts[key] ?? 0) + 1
  }
  const out: DayTotal[] = []
  let cursor = from
  let guard = 0
  while (cursor <= to && guard < 1000) {
    out.push({ date: cursor, seconds: seconds[cursor] ?? 0, sessions: counts[cursor] ?? 0 })
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return out
}

export function heatmap(db: DB, from: string, to: string): Record<string, number> {
  return groupSecondsByDay(listSessions(db, { from: localStartIso(from), to: localEndIso(to), limit: 5000 }))
}

export function subjectTotals(db: DB): SubjectTotal[] {
  const subjects = listSubjects(db)
  const byId = new Map<string, SubjectTotal>(
    subjects.map((s) => [s.id, { subjectId: s.id, name: s.name, color: s.color, seconds: 0, sessions: 0 }]),
  )
  for (const session of studySessions(db)) {
    if (!session.subjectId) continue
    const entry = byId.get(session.subjectId)
    if (!entry) continue
    entry.seconds += session.durationSeconds
    entry.sessions += 1
  }
  return [...byId.values()].sort((a, b) => b.seconds - a.seconds)
}

function dailyGoalTarget(db: DB): number {
  const goal = listGoals(db).find((g) => g.type === 'daily_minutes' && !g.archived)
  return goal ? goal.targetValue : 0
}

function achievementSnapshot(db: DB): AchievementSnapshot {
  const sessions = studySessions(db)
  const days = [...new Set(sessions.map((s) => dateKey(s.startTime)))]
  const focusSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
  const subjectList = listSubjects(db)
  const chapters = listChapters(db, null)
  const subjectsWithAllChapters = subjectList.filter((subject) => {
    const own = chapters.filter((c) => c.subjectId === subject.id)
    return own.length > 0 && own.every((c) => c.status === 'completed')
  }).length
  const goalMinutes = dailyGoalTarget(db)
  const today = todayKey()
  const todaySeconds = sessions
    .filter((s) => dateKey(s.startTime) === today)
    .reduce((sum, s) => sum + s.durationSeconds, 0)
  const xp = computeXp({ focusSeconds, totalSessions: sessions.length, achievements: listAchievementRows(db).length })
  return {
    totalSessions: sessions.length,
    focusSeconds,
    streak: computeStreak(days),
    longestStreak: computeLongestStreak(days),
    todayGoalMet: goalMinutes > 0 && todaySeconds >= goalMinutes * 60,
    subjectsWithAllChapters,
    level: levelFromXp(xp).level,
  }
}

export function achievementsState(db: DB): AchievementState[] {
  const unlocked: Record<string, string | null> = {}
  for (const row of listAchievementRows(db)) unlocked[row.key] = row.unlockedAt
  const states = evaluateAchievements(achievementSnapshot(db), unlocked)
  const toUnlock = newlyUnlocked(states, new Set(Object.keys(unlocked)))
  if (toUnlock.length > 0) {
    unlockAchievements(db, toUnlock.map((s) => s.key))
    const fresh = listAchievementRows(db)
    const map: Record<string, string | null> = {}
    for (const row of fresh) map[row.key] = row.unlockedAt
    return evaluateAchievements(achievementSnapshot(db), map)
  }
  return states
}

export function overview(db: DB): OverviewStats {
  const sessions = studySessions(db)
  const days = [...new Set(sessions.map((s) => dateKey(s.startTime)))]
  const today = todayKey()
  const weekStart = startOfWeekKey(today)
  const monthStart = startOfMonthKey(today)
  const totals = groupSecondsByDay(sessions)
  const todaySeconds = totals[today] ?? 0
  const weekSeconds = Object.entries(totals)
    .filter(([key]) => key >= weekStart && key <= today)
    .reduce((sum, [, value]) => sum + value, 0)
  const monthSeconds = Object.entries(totals)
    .filter(([key]) => key >= monthStart && key <= today)
    .reduce((sum, [, value]) => sum + value, 0)
  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
  const tasks = listTasks(db)
  const goalMinutes = dailyGoalTarget(db)
  const allSessions = listSessions(db)
  const focusSeconds = allSessions
    .filter((s) => s.type === 'focus' || s.type === 'long_break' || s.type === 'short_break')
    .filter((s) => s.type === 'focus')
    .reduce((sum, s) => sum + s.durationSeconds, 0)
  const breakSeconds = allSessions
    .filter((s) => s.type === 'short_break' || s.type === 'long_break')
    .reduce((sum, s) => sum + s.durationSeconds, 0)
  const xp = computeXp({
    focusSeconds: totalSeconds,
    totalSessions: sessions.length,
    achievements: listAchievementRows(db).length,
  })
  return {
    todaySeconds,
    todaySessions: sessions.filter((s) => dateKey(s.startTime) === today).length,
    streak: computeStreak(days),
    longestStreak: computeLongestStreak(days),
    weekSeconds,
    monthSeconds,
    totalSeconds,
    totalSessions: sessions.length,
    completedTasks: tasks.filter((t) => t.status === 'done').length,
    openTasks: tasks.filter((t) => t.status !== 'done').length,
    goalCompletion: goalMinutes > 0 ? Math.min(100, Math.round((todaySeconds / (goalMinutes * 60)) * 100)) : 0,
    todayGoalMinutes: goalMinutes,
    focusSeconds,
    breakSeconds,
    subjectCount: listSubjects(db).length,
    noteCount: listNotes(db).length,
    level: levelFromXp(xp),
  }
}

export function analytics(db: DB): AnalyticsSummary {
  const all = listSessions(db)
  const study = all.filter(isStudySession)
  const focusSeconds = all.filter((s) => s.type === 'focus').reduce((sum, s) => sum + s.durationSeconds, 0)
  const breakSeconds = all
    .filter((s) => s.type === 'short_break' || s.type === 'long_break')
    .reduce((sum, s) => sum + s.durationSeconds, 0)
  const totalSeconds = study.reduce((sum, s) => sum + s.durationSeconds, 0)
  const totals = groupSecondsByDay(study)
  const dayKeys = Object.keys(totals).sort()
  const activeDays = dayKeys.length
  const longestSession = study.reduce((max, s) => Math.max(max, s.durationSeconds), 0)
  const subjectList = subjectTotals(db)
  const mostStudiedSubject = subjectList[0] ?? null
  const bestDay = dayKeys.reduce<DayTotal | null>((best, key) => {
    const seconds = totals[key] ?? 0
    if (!best || seconds > best.seconds) {
      return { date: key, seconds, sessions: study.filter((s) => dateKey(s.startTime) === key).length }
    }
    return best
  }, null)
  const completionRate =
    all.length > 0 ? Math.round((all.filter((s) => s.completed).length / all.length) * 100) : 0
  const weekCount = Math.max(1, Math.ceil(activeDays / 7))
  const monthCount = Math.max(1, new Set(dayKeys.map((k) => k.slice(0, 7))).size)
  return {
    totalSeconds,
    dailyAverage: activeDays > 0 ? Math.round(totalSeconds / activeDays) : 0,
    weeklyAverage: Math.round(totalSeconds / weekCount),
    monthlyAverage: Math.round(totalSeconds / monthCount),
    longestSessionSeconds: longestSession,
    mostStudiedSubject,
    mostProductiveDay: bestDay,
    completionRate,
    focusSeconds,
    breakSeconds,
    activeDays,
    streakHistory: dayKeys.slice(-90).map((key) => ({ date: key, seconds: totals[key] ?? 0 })),
  }
}

export function goalProgress(db: DB, now: Date = new Date()): GoalProgress[] {
  const goals = listGoals(db).filter((g) => !g.archived)
  const study = studySessions(db)
  const subjects = listSubjects(db)
  const chapters = listChapters(db, null)
  return goals.map((goal) => {
    let current = 0
    let periodLabel = 'All time'
    if (goal.type === 'daily_minutes' || goal.type === 'weekly_minutes' || goal.type === 'monthly_minutes') {
      const window = goalWindow(goal.type, now)
      const seconds = study
        .filter((s) => {
          const key = dateKey(s.startTime)
          return key >= window.from && key <= window.to
        })
        .reduce((sum, s) => sum + s.durationSeconds, 0)
      current = Math.round(seconds / 60)
      periodLabel = window.label
    } else if (goal.type === 'subject_minutes') {
      current = Math.round(
        study.filter((s) => s.subjectId === goal.subjectId).reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
      )
      periodLabel = 'All time'
    } else if (goal.type === 'session_count') {
      current = study.length
      periodLabel = 'All time'
    } else {
      current = chapters.filter((c) => c.status === 'completed').length
      periodLabel = 'All chapters'
    }
    const target = Math.max(1, goal.targetValue)
    const subject = goal.subjectId ? subjects.find((s) => s.id === goal.subjectId) ?? null : null
    return {
      goal,
      current,
      target,
      percent: Math.min(100, Math.round((current / target) * 100)),
      periodLabel,
      subjectName: subject ? subject.name : null,
    }
  })
}

export function habitsWithHistory(db: DB, now: Date = new Date()): HabitWithHistory[] {
  const habits = listHabits(db)
  const from = addDays(todayKey(now), -180)
  const completions = listHabitCompletions(db, from)
  return habits.map((habit) => {
    const dates = completions.filter((c) => c.habitId === habit.id).map((c) => c.date)
    return {
      ...habit,
      completions: dates,
      streak: habitStreak(dates, now),
      completionRate: habitCompletionRate(dates, 30, now),
    }
  })
}

export function dashboardSnapshot(db: DB) {
  return {
    overview: overview(db),
    analytics: analytics(db),
    subjects: subjectTotals(db),
    goals: goalProgress(db),
    achievements: achievementsState(db),
  }
}

export function durationLabel(seconds: number): string {
  return formatDuration(seconds)
}
