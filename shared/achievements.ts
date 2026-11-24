import type { AchievementState } from './types'

export interface AchievementSnapshot {
  totalSessions: number
  focusSeconds: number
  streak: number
  longestStreak: number
  todayGoalMet: boolean
  subjectsWithAllChapters: number
  level: number
}

interface Definition {
  key: string
  title: string
  description: string
  xp: number
  icon: string
  target: number
  measure: (s: AchievementSnapshot) => number
}

export const ACHIEVEMENTS: Definition[] = [
  {
    key: 'first_session',
    title: 'First Step',
    description: 'Record your first study session.',
    xp: 50,
    icon: 'sparkles',
    target: 1,
    measure: (s) => s.totalSessions,
  },
  {
    key: 'five_hours',
    title: 'Five Hour Club',
    description: 'Study for a total of five hours.',
    xp: 100,
    icon: 'clock',
    target: 5 * 3600,
    measure: (s) => s.focusSeconds,
  },
  {
    key: 'ten_sessions',
    title: 'Getting Consistent',
    description: 'Complete ten study sessions.',
    xp: 100,
    icon: 'list-checks',
    target: 10,
    measure: (s) => s.totalSessions,
  },
  {
    key: 'streak_7',
    title: 'Seven Day Streak',
    description: 'Study on seven consecutive days.',
    xp: 150,
    icon: 'flame',
    target: 7,
    measure: (s) => s.longestStreak,
  },
  {
    key: 'streak_30',
    title: 'Thirty Day Streak',
    description: 'Study on thirty consecutive days.',
    xp: 400,
    icon: 'flame',
    target: 30,
    measure: (s) => s.longestStreak,
  },
  {
    key: 'focus_100h',
    title: 'Hundred Focus Hours',
    description: 'Reach one hundred hours of focused study.',
    xp: 500,
    icon: 'trophy',
    target: 100 * 3600,
    measure: (s) => s.focusSeconds,
  },
  {
    key: 'daily_goal',
    title: 'Goal Crusher',
    description: 'Complete a daily study goal.',
    xp: 75,
    icon: 'target',
    target: 1,
    measure: (s) => (s.todayGoalMet ? 1 : 0),
  },
  {
    key: 'subject_master',
    title: 'Subject Master',
    description: 'Finish every chapter of a subject.',
    xp: 250,
    icon: 'graduation-cap',
    target: 1,
    measure: (s) => s.subjectsWithAllChapters,
  },
  {
    key: 'level_5',
    title: 'Rising Scholar',
    description: 'Reach level five.',
    xp: 200,
    icon: 'star',
    target: 5,
    measure: (s) => s.level,
  },
]

export function evaluateAchievements(
  snapshot: AchievementSnapshot,
  unlocked: Record<string, string | null>,
): AchievementState[] {
  return ACHIEVEMENTS.map((def) => ({
    key: def.key,
    title: def.title,
    description: def.description,
    xp: def.xp,
    icon: def.icon,
    unlockedAt: unlocked[def.key] ?? null,
    progress: Math.min(def.measure(snapshot), def.target),
    target: def.target,
  }))
}

export function newlyUnlocked(states: AchievementState[], previouslyUnlocked: Set<string>): AchievementState[] {
  return states.filter((s) => !previouslyUnlocked.has(s.key) && s.progress >= s.target)
}
