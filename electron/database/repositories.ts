import { randomUUID } from 'node:crypto'
import type { DB } from './index'
import { DEFAULT_SETTINGS } from '../../shared/defaults'
import type {
  AppSettings,
  Chapter,
  Goal,
  Habit,
  HabitCompletion,
  Note,
  StudySchedule,
  StudySession,
  Subject,
  Task,
  TimerState,
} from '../../shared/types'

const nowIso = (): string => new Date().toISOString()
export const uid = (): string => randomUUID()

type Row = Record<string, unknown>

function applyUpdate(
  db: DB,
  table: string,
  id: string,
  patch: Record<string, unknown>,
  columnMap: Record<string, string>,
  extra: Record<string, unknown> = {},
): void {
  const entries = Object.entries(patch).filter(([key, value]) => value !== undefined && columnMap[key])
  if (entries.length === 0) return
  const sets = entries.map(([key]) => `${columnMap[key]} = ?`)
  const values = entries.map(([, value]) => normalizeValue(value))
  for (const [column, value] of Object.entries(extra)) {
    sets.push(`${column} = ?`)
    values.push(value)
  }
  void extra
  values.push(id)
  db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0
  return value
}

/* ------------------------------------------------------------------ subjects */

const SUBJECT_COLUMNS = `id, name, color, icon, description, target_hours AS targetHours, created_at AS createdAt, updated_at AS updatedAt`
const SUBJECT_MAP = { name: 'name', color: 'color', icon: 'icon', description: 'description', targetHours: 'target_hours' }

export function listSubjects(db: DB): Subject[] {
  return db.prepare(`SELECT ${SUBJECT_COLUMNS} FROM subjects ORDER BY name COLLATE NOCASE ASC`).all() as Subject[]
}

export function createSubject(db: DB, input: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Subject {
  const id = uid()
  const stamp = nowIso()
  db.prepare(
    `INSERT INTO subjects (id, name, color, icon, description, target_hours, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.name, input.color, input.icon, input.description, input.targetHours, stamp, stamp)
  return getSubject(db, id)!
}

export function getSubject(db: DB, id: string): Subject | null {
  return (db.prepare(`SELECT ${SUBJECT_COLUMNS} FROM subjects WHERE id = ?`).get(id) as Subject | undefined) ?? null
}

export function updateSubject(db: DB, id: string, patch: Partial<Omit<Subject, 'id' | 'createdAt'>>): Subject | null {
  applyUpdate(db, 'subjects', id, patch, SUBJECT_MAP, { updated_at: nowIso() })
  return getSubject(db, id)
}

export function deleteSubject(db: DB, id: string): void {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(id)
}

/* ------------------------------------------------------------------ chapters */

const CHAPTER_COLUMNS = `id, subject_id AS subjectId, title, status, position, created_at AS createdAt`
const CHAPTER_MAP = { title: 'title', status: 'status', position: 'position' }

export function listChapters(db: DB, subjectId: string | null): Chapter[] {
  if (subjectId) {
    return db
      .prepare(`SELECT ${CHAPTER_COLUMNS} FROM chapters WHERE subject_id = ? ORDER BY position ASC, title ASC`)
      .all(subjectId) as Chapter[]
  }
  return db.prepare(`SELECT ${CHAPTER_COLUMNS} FROM chapters ORDER BY position ASC, title ASC`).all() as Chapter[]
}

export function createChapter(db: DB, input: { subjectId: string; title: string; status: 'pending' | 'completed' }): Chapter {
  const id = uid()
  const max = db.prepare('SELECT COALESCE(MAX(position), -1) AS position FROM chapters WHERE subject_id = ?').get(input.subjectId) as {
    position: number
  }
  db.prepare('INSERT INTO chapters (id, subject_id, title, status, position, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    input.subjectId,
    input.title,
    input.status,
    max.position + 1,
    nowIso(),
  )
  return db.prepare(`SELECT ${CHAPTER_COLUMNS} FROM chapters WHERE id = ?`).get(id) as Chapter
}

export function updateChapter(db: DB, id: string, patch: Partial<Pick<Chapter, 'title' | 'status' | 'position'>>): Chapter | null {
  applyUpdate(db, 'chapters', id, patch, CHAPTER_MAP)
  return (db.prepare(`SELECT ${CHAPTER_COLUMNS} FROM chapters WHERE id = ?`).get(id) as Chapter | undefined) ?? null
}

export function deleteChapter(db: DB, id: string): void {
  db.prepare('DELETE FROM chapters WHERE id = ?').run(id)
}

/* ------------------------------------------------------------------ sessions */

const SESSION_COLUMNS = `id, subject_id AS subjectId, chapter_id AS chapterId, topic, type, start_time AS startTime,
  end_time AS endTime, duration_seconds AS durationSeconds, notes, completed, created_at AS createdAt`
const SESSION_MAP = {
  subjectId: 'subject_id',
  chapterId: 'chapter_id',
  topic: 'topic',
  type: 'type',
  startTime: 'start_time',
  endTime: 'end_time',
  durationSeconds: 'duration_seconds',
  notes: 'notes',
  completed: 'completed',
}

function toSession(row: Row): StudySession {
  return { ...(row as unknown as StudySession), completed: Boolean(row.completed) }
}

export function listSessions(
  db: DB,
  filter: { from?: string; to?: string; subjectId?: string; search?: string; limit?: number } = {},
): StudySession[] {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filter.from) {
    clauses.push('start_time >= ?')
    params.push(filter.from)
  }
  if (filter.to) {
    clauses.push('start_time <= ?')
    params.push(filter.to)
  }
  if (filter.subjectId) {
    clauses.push('subject_id = ?')
    params.push(filter.subjectId)
  }
  if (filter.search) {
    clauses.push('(topic LIKE ? OR notes LIKE ?)')
    params.push(`%${filter.search}%`, `%${filter.search}%`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = filter.limit ? `LIMIT ${Math.floor(filter.limit)}` : ''
  const rows = db.prepare(`SELECT ${SESSION_COLUMNS} FROM study_sessions ${where} ORDER BY start_time DESC ${limit}`).all(...params) as Row[]
  return rows.map(toSession)
}

export function createSession(db: DB, input: Omit<StudySession, 'id' | 'createdAt'>): StudySession {
  const duplicate = db
    .prepare(
      `SELECT ${SESSION_COLUMNS} FROM study_sessions
       WHERE start_time = ? AND type = ? AND duration_seconds = ? AND COALESCE(subject_id, '') = COALESCE(?, '')`,
    )
    .get(input.startTime, input.type, input.durationSeconds, input.subjectId) as Row | undefined
  if (duplicate) return toSession(duplicate)

  const id = uid()
  db.prepare(
    `INSERT INTO study_sessions
      (id, subject_id, chapter_id, topic, type, start_time, end_time, duration_seconds, notes, completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.subjectId,
    input.chapterId,
    input.topic,
    input.type,
    input.startTime,
    input.endTime,
    Math.max(0, Math.round(input.durationSeconds)),
    input.notes,
    input.completed ? 1 : 0,
    nowIso(),
  )
  return getSession(db, id)!
}

export function getSession(db: DB, id: string): StudySession | null {
  const row = db.prepare(`SELECT ${SESSION_COLUMNS} FROM study_sessions WHERE id = ?`).get(id) as Row | undefined
  return row ? toSession(row) : null
}

export function updateSession(db: DB, id: string, patch: Partial<Omit<StudySession, 'id' | 'createdAt'>>): StudySession | null {
  applyUpdate(db, 'study_sessions', id, patch, SESSION_MAP)
  return getSession(db, id)
}

export function deleteSession(db: DB, id: string): void {
  db.prepare('DELETE FROM study_sessions WHERE id = ?').run(id)
}

/* ---------------------------------------------------------------------- tasks */

const TASK_COLUMNS = `id, title, description, subject_id AS subjectId, chapter_id AS chapterId, priority,
  due_date AS dueDate, estimated_minutes AS estimatedMinutes, status, notes, created_at AS createdAt, completed_at AS completedAt`
const TASK_MAP = {
  title: 'title',
  description: 'description',
  subjectId: 'subject_id',
  chapterId: 'chapter_id',
  priority: 'priority',
  dueDate: 'due_date',
  estimatedMinutes: 'estimated_minutes',
  status: 'status',
  notes: 'notes',
}

export function listTasks(db: DB): Task[] {
  return db
    .prepare(`SELECT ${TASK_COLUMNS} FROM tasks ORDER BY (status = 'done') ASC, priority DESC, COALESCE(due_date, '9999') ASC, created_at DESC`)
    .all() as Task[]
}

export function createTask(db: DB, input: Omit<Task, 'id' | 'createdAt' | 'completedAt'>): Task {
  const id = uid()
  db.prepare(
    `INSERT INTO tasks (id, title, description, subject_id, chapter_id, priority, due_date, estimated_minutes, status, notes, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title,
    input.description,
    input.subjectId,
    input.chapterId,
    input.priority,
    input.dueDate,
    input.estimatedMinutes,
    input.status,
    input.notes,
    nowIso(),
    input.status === 'done' ? nowIso() : null,
  )
  return getTask(db, id)!
}

export function getTask(db: DB, id: string): Task | null {
  return (db.prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`).get(id) as Task | undefined) ?? null
}

export function updateTask(db: DB, id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
  const extra: Record<string, unknown> = {}
  if (patch.status === 'done') extra.completed_at = nowIso()
  if (patch.status && patch.status !== 'done') extra.completed_at = null
  applyUpdate(db, 'tasks', id, patch, TASK_MAP, extra)
  return getTask(db, id)
}

export function deleteTask(db: DB, id: string): void {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

/* ---------------------------------------------------------------------- goals */

const GOAL_COLUMNS = `id, type, target_value AS targetValue, subject_id AS subjectId, created_at AS createdAt, archived`
const GOAL_MAP = { type: 'type', targetValue: 'target_value', subjectId: 'subject_id', archived: 'archived' }

export function listGoals(db: DB): Goal[] {
  const rows = db.prepare(`SELECT ${GOAL_COLUMNS} FROM goals ORDER BY archived ASC, created_at ASC`).all() as Row[]
  return rows.map((row) => ({ ...(row as unknown as Goal), archived: Boolean(row.archived) }))
}

export function createGoal(db: DB, input: { type: Goal['type']; targetValue: number; subjectId: string | null; archived?: boolean }): Goal {
  const id = uid()
  db.prepare('INSERT INTO goals (id, type, target_value, subject_id, created_at, archived) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    input.type,
    input.targetValue,
    input.type === 'subject_minutes' ? input.subjectId : null,
    nowIso(),
    input.archived ? 1 : 0,
  )
  return db.prepare(`SELECT ${GOAL_COLUMNS} FROM goals WHERE id = ?`).get(id) as Goal
}

export function updateGoal(db: DB, id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>): Goal | null {
  applyUpdate(db, 'goals', id, patch, GOAL_MAP)
  const row = db.prepare(`SELECT ${GOAL_COLUMNS} FROM goals WHERE id = ?`).get(id) as Row | undefined
  return row ? ({ ...(row as unknown as Goal), archived: Boolean(row.archived) } as Goal) : null
}

export function deleteGoal(db: DB, id: string): void {
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}

/* --------------------------------------------------------------------- habits */

const HABIT_COLUMNS = `id, name, description, color, icon, archived, created_at AS createdAt`
const HABIT_MAP = { name: 'name', description: 'description', color: 'color', icon: 'icon' }

export function listHabits(db: DB): Habit[] {
  const rows = db.prepare(`SELECT ${HABIT_COLUMNS} FROM habits WHERE archived = 0 ORDER BY created_at ASC`).all() as Row[]
  return rows.map((row) => ({ ...(row as unknown as Habit), archived: Boolean(row.archived) }))
}

export function createHabit(db: DB, input: Omit<Habit, 'id' | 'archived' | 'createdAt'>): Habit {
  const id = uid()
  db.prepare('INSERT INTO habits (id, name, description, color, icon, archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)').run(
    id,
    input.name,
    input.description,
    input.color,
    input.icon,
    nowIso(),
  )
  return db.prepare(`SELECT ${HABIT_COLUMNS} FROM habits WHERE id = ?`).get(id) as Habit
}

export function updateHabit(db: DB, id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>): Habit | null {
  applyUpdate(db, 'habits', id, patch, HABIT_MAP)
  const row = db.prepare(`SELECT ${HABIT_COLUMNS} FROM habits WHERE id = ?`).get(id) as Row | undefined
  return row ? { ...(row as unknown as Habit), archived: Boolean(row.archived) } : null
}

export function archiveHabit(db: DB, id: string): void {
  db.prepare('UPDATE habits SET archived = 1 WHERE id = ?').run(id)
}

export function listHabitCompletions(db: DB, from: string): HabitCompletion[] {
  return db
    .prepare(
      `SELECT id, habit_id AS habitId, date, created_at AS createdAt FROM habit_completions WHERE date >= ? ORDER BY date ASC`,
    )
    .all(from) as HabitCompletion[]
}

export function toggleHabitCompletion(db: DB, habitId: string, date: string): boolean {
  const existing = db
    .prepare('SELECT id FROM habit_completions WHERE habit_id = ? AND date = ?')
    .get(habitId, date) as { id: string } | undefined
  if (existing) {
    db.prepare('DELETE FROM habit_completions WHERE id = ?').run(existing.id)
    return false
  }
  db.prepare('INSERT INTO habit_completions (id, habit_id, date, created_at) VALUES (?, ?, ?, ?)').run(uid(), habitId, date, nowIso())
  return true
}

/* ---------------------------------------------------------------------- notes */

const NOTE_COLUMNS = `id, title, content, subject_id AS subjectId, pinned, created_at AS createdAt, updated_at AS updatedAt`
const NOTE_MAP = { title: 'title', content: 'content', subjectId: 'subject_id', pinned: 'pinned' }

export function listNotes(db: DB): Note[] {
  const rows = db
    .prepare(`SELECT ${NOTE_COLUMNS} FROM notes ORDER BY pinned DESC, updated_at DESC`)
    .all() as Row[]
  return rows.map((row) => ({ ...(row as unknown as Note), pinned: Boolean(row.pinned) }))
}

export function createNote(db: DB, input: { title: string; content: string; subjectId: string | null; pinned: boolean }): Note {
  const id = uid()
  const stamp = nowIso()
  db.prepare('INSERT INTO notes (id, title, content, subject_id, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    input.title,
    input.content,
    input.subjectId,
    input.pinned ? 1 : 0,
    stamp,
    stamp,
  )
  return getNote(db, id)!
}

export function getNote(db: DB, id: string): Note | null {
  const row = db.prepare(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ?`).get(id) as Row | undefined
  return row ? { ...(row as unknown as Note), pinned: Boolean(row.pinned) } : null
}

export function updateNote(db: DB, id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>): Note | null {
  applyUpdate(db, 'notes', id, patch, NOTE_MAP, { updated_at: nowIso() })
  return getNote(db, id)
}

export function deleteNote(db: DB, id: string): void {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
}

/* ------------------------------------------------------------------ schedules */

const SCHEDULE_COLUMNS = `id, subject_id AS subjectId, task_id AS taskId, date, start_minute AS startMinute,
  end_minute AS endMinute, note, created_at AS createdAt`
const SCHEDULE_MAP = {
  subjectId: 'subject_id',
  taskId: 'task_id',
  date: 'date',
  startMinute: 'start_minute',
  endMinute: 'end_minute',
  note: 'note',
}

export function listSchedules(db: DB, from: string, to: string): StudySchedule[] {
  return db
    .prepare(`SELECT ${SCHEDULE_COLUMNS} FROM study_schedules WHERE date >= ? AND date <= ? ORDER BY date ASC, start_minute ASC`)
    .all(from, to) as StudySchedule[]
}

export function createSchedule(db: DB, input: Omit<StudySchedule, 'id' | 'createdAt'>): StudySchedule {
  const id = uid()
  db.prepare(
    `INSERT INTO study_schedules (id, subject_id, task_id, date, start_minute, end_minute, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.subjectId, input.taskId, input.date, input.startMinute, input.endMinute, input.note, nowIso())
  return db.prepare(`SELECT ${SCHEDULE_COLUMNS} FROM study_schedules WHERE id = ?`).get(id) as StudySchedule
}

export function updateSchedule(db: DB, id: string, patch: Partial<Omit<StudySchedule, 'id' | 'createdAt'>>): StudySchedule | null {
  applyUpdate(db, 'study_schedules', id, patch, SCHEDULE_MAP)
  return (db.prepare(`SELECT ${SCHEDULE_COLUMNS} FROM study_schedules WHERE id = ?`).get(id) as StudySchedule | undefined) ?? null
}

export function deleteSchedule(db: DB, id: string): void {
  db.prepare('DELETE FROM study_schedules WHERE id = ?').run(id)
}

/* ------------------------------------------------------------------- settings */

const SETTINGS_KEY = 'app'

export function getSettings(db: DB): AppSettings {
  const row = db.prepare('SELECT value FROM user_settings WHERE key = ?').get(SETTINGS_KEY) as { value: string } | undefined
  if (!row) return structuredClone(DEFAULT_SETTINGS)
  try {
    const parsed = JSON.parse(row.value) as Partial<AppSettings>
    return { ...structuredClone(DEFAULT_SETTINGS), ...parsed, timer: { ...DEFAULT_SETTINGS.timer, ...(parsed.timer ?? {}) } }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export function updateSettings(db: DB, patch: Partial<AppSettings>): AppSettings {
  const current = getSettings(db)
  const merged: AppSettings = {
    ...current,
    ...patch,
    timer: { ...current.timer, ...(patch.timer ?? {}) },
  }
  db.prepare(
    `INSERT INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(SETTINGS_KEY, JSON.stringify(merged), nowIso())
  return merged
}

/* ----------------------------------------------------------------- timer state */

export const IDLE_TIMER: TimerState = {
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
}

export function getTimerState(db: DB): TimerState {
  const row = db
    .prepare(
      `SELECT mode, status, started_at AS startedAt, ends_at AS endsAt, duration_seconds AS durationSeconds,
        remaining_seconds AS remainingSeconds, completed_focus_count AS completedFocusCount,
        subject_id AS subjectId, task_id AS taskId, updated_at AS updatedAt
       FROM timer_state WHERE id = 'active'`,
    )
    .get() as TimerState | undefined
  return row ?? { ...IDLE_TIMER }
}

export function saveTimerState(db: DB, state: TimerState): TimerState {
  db.prepare(
    `INSERT INTO timer_state (id, mode, status, started_at, ends_at, duration_seconds, remaining_seconds,
      completed_focus_count, subject_id, task_id, updated_at)
     VALUES ('active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, status = excluded.status, started_at = excluded.started_at,
       ends_at = excluded.ends_at, duration_seconds = excluded.duration_seconds,
       remaining_seconds = excluded.remaining_seconds, completed_focus_count = excluded.completed_focus_count,
       subject_id = excluded.subject_id, task_id = excluded.task_id, updated_at = excluded.updated_at`,
  ).run(
    state.mode,
    state.status,
    state.startedAt,
    state.endsAt,
    state.durationSeconds,
    state.remainingSeconds,
    state.completedFocusCount,
    state.subjectId,
    state.taskId,
    nowIso(),
  )
  return getTimerState(db)
}

export function clearTimerState(db: DB): void {
  db.prepare('DELETE FROM timer_state').run()
}

/* --------------------------------------------------------------- achievements */

export function listAchievementRows(db: DB): { key: string; unlockedAt: string }[] {
  return db.prepare('SELECT key, unlocked_at AS unlockedAt FROM achievements').all() as { key: string; unlockedAt: string }[]
}

export function unlockAchievements(db: DB, keys: string[]): string[] {
  const insert = db.prepare('INSERT OR IGNORE INTO achievements (key, unlocked_at) VALUES (?, ?)')
  const stamp = nowIso()
  const added: string[] = []
  const run = db.transaction((list: string[]) => {
    for (const key of list) {
      const result = insert.run(key, stamp)
      if (result.changes > 0) added.push(key)
    }
  })
  run(keys)
  return added
}

export function clearAchievements(db: DB): void {
  db.prepare('DELETE FROM achievements').run()
}
