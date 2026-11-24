import type { DB } from '../database'
import {
  listAchievementRows,
  listChapters,
  listGoals,
  listHabitCompletions,
  listHabits,
  listNotes,
  listSchedules,
  listSessions,
  listSubjects,
  listTasks,
  getSettings,
} from '../database/repositories'

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function sessionsToCsv(db: DB): { csv: string; rows: number } {
  const subjects = new Map(listSubjects(db).map((s) => [s.id, s.name]))
  const chapters = new Map(listChapters(db, null).map((c) => [c.id, c.title]))
  const sessions = listSessions(db)
  const header = ['id', 'date', 'start_time', 'end_time', 'duration_minutes', 'type', 'subject', 'chapter', 'topic', 'completed', 'notes']
  const lines = [header.join(',')]
  for (const session of sessions) {
    lines.push(
      [
        session.id,
        session.startTime.slice(0, 10),
        session.startTime,
        session.endTime,
        (session.durationSeconds / 60).toFixed(2),
        session.type,
        session.subjectId ? subjects.get(session.subjectId) ?? '' : '',
        session.chapterId ? chapters.get(session.chapterId) ?? '' : '',
        session.topic,
        session.completed ? 'yes' : 'no',
        session.notes,
      ]
        .map(csvCell)
        .join(','),
    )
  }
  return { csv: `${lines.join('\n')}\n`, rows: sessions.length }
}

export function databaseToJson(db: DB): Record<string, unknown> {
  return {
    app: 'StudyFlow',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(db),
    subjects: listSubjects(db),
    chapters: listChapters(db, null),
    sessions: listSessions(db),
    tasks: listTasks(db),
    goals: listGoals(db),
    habits: listHabits(db),
    habitCompletions: listHabitCompletions(db, '1970-01-01'),
    notes: listNotes(db),
    schedules: listSchedules(db, '1970-01-01', '2999-12-31'),
    achievements: listAchievementRows(db),
  }
}

export function clearAllData(db: DB): void {
  const tables = [
    'habit_completions',
    'study_schedules',
    'notes',
    'achievements',
    'timer_state',
    'study_sessions',
    'chapters',
    'tasks',
    'goals',
    'habits',
    'subjects',
    'user_settings',
  ]
  const run = db.transaction(() => {
    for (const table of tables) db.prepare(`DELETE FROM ${table}`).run()
  })
  run()
}

export function summarizeDatabase(db: DB): Record<string, number> {
  const count = (table: string): number => {
    const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }
    return row.total
  }
  return {
    subjects: count('subjects'),
    chapters: count('chapters'),
    sessions: count('study_sessions'),
    tasks: count('tasks'),
    goals: count('goals'),
    habits: count('habits'),
    notes: count('notes'),
    schedules: count('study_schedules'),
  }
}
