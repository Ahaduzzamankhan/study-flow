import type { StudySession } from './types'

export const STUDY_TYPES: StudySession['type'][] = ['focus', 'manual']

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Local-time YYYY-MM-DD key for an ISO timestamp or Date. */
export function dateKey(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now)
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  date.setDate(date.getDate() + delta)
  return dateKey(date)
}

export function addDaysToDate(date: Date, delta: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + delta)
  return copy
}

/** Monday-based start of week. */
export function startOfWeekKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  return dateKey(date)
}

export function startOfMonthKey(key: string): string {
  return `${key.slice(0, 7)}-01`
}

export function endOfMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return dateKey(new Date(y ?? 1970, m ?? 1, 0))
}

export function isStudySession(session: Pick<StudySession, 'type'>): boolean {
  return session.type === 'focus' || session.type === 'manual'
}

export function studySeconds(sessions: Pick<StudySession, 'type' | 'durationSeconds'>[]): number {
  return sessions.reduce((sum, s) => (STUDY_TYPES.includes(s.type) ? sum + Math.max(0, s.durationSeconds) : sum), 0)
}

export function groupSecondsByDay(
  sessions: { type: StudySession['type']; durationSeconds: number; startTime: string }[],
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of sessions) {
    if (!STUDY_TYPES.includes(s.type)) continue
    const key = dateKey(s.startTime)
    if (!key) continue
    out[key] = (out[key] ?? 0) + Math.max(0, s.durationSeconds)
  }
  return out
}

/**
 * Consecutive study days ending today (or yesterday, so a streak is not lost
 * before the day's first session).
 */
export function computeStreak(dayKeys: string[], now: Date = new Date()): number {
  const unique = new Set(dayKeys.filter(Boolean))
  const today = todayKey(now)
  let cursor = unique.has(today) ? today : addDays(today, -1)
  if (!unique.has(cursor)) return 0
  let streak = 0
  while (unique.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function computeLongestStreak(dayKeys: string[]): number {
  const sorted = [...new Set(dayKeys.filter(Boolean))].sort()
  let best = 0
  let run = 0
  let previous: string | null = null
  for (const key of sorted) {
    if (previous && addDays(previous, 1) === key) run += 1
    else run = 1
    previous = key
    if (run > best) best = run
  }
  return best
}

export function habitStreak(dates: string[], now: Date = new Date()): number {
  return computeStreak(dates, now)
}

export function habitCompletionRate(dates: string[], days = 30, now: Date = new Date()): number {
  const set = new Set(dates)
  let done = 0
  for (let i = 0; i < days; i += 1) {
    if (set.has(addDays(todayKey(now), -i))) done += 1
  }
  return Math.round((done / days) * 100)
}

export function goalWindow(type: string, now: Date = new Date()): { from: string; to: string; label: string } {
  const today = todayKey(now)
  if (type === 'daily_minutes') return { from: today, to: today, label: 'Today' }
  if (type === 'weekly_minutes') {
    const from = startOfWeekKey(today)
    return { from, to: addDays(from, 6), label: 'This week' }
  }
  if (type === 'monthly_minutes') {
    return { from: startOfMonthKey(today), to: endOfMonthKey(today), label: 'This month' }
  }
  return { from: today, to: today, label: 'Progress' }
}

export function minutesToSeconds(minutes: number): number {
  return Math.round(minutes * 60)
}

export function formatDuration(totalSeconds: number, style: 'short' | 'clock' = 'short'): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (style === 'clock') {
    const seconds = safe % 60
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
  }
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${safe}s`
}

export function levelFromXp(xp: number): { xp: number; level: number; levelXp: number; nextLevelXp: number; progress: number } {
  const safeXp = Math.max(0, Math.floor(xp))
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1
  const levelXp = 100 * (level - 1) ** 2
  const nextLevelXp = 100 * level ** 2
  const span = nextLevelXp - levelXp || 1
  return {
    xp: safeXp,
    level,
    levelXp,
    nextLevelXp,
    progress: Math.min(100, Math.round(((safeXp - levelXp) / span) * 100)),
  }
}

export function computeXp(input: { focusSeconds: number; totalSessions: number; achievements: number }): number {
  return (
    Math.floor(input.focusSeconds / 60) +
    input.totalSessions * 10 +
    input.achievements * 50
  )
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
