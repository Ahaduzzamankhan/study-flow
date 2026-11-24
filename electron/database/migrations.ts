import type { Database } from 'better-sqlite3'

interface Migration {
  version: number
  name: string
  up: string[]
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: [
      `CREATE TABLE subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#8B7CF6',
        icon TEXT NOT NULL DEFAULT 'book',
        description TEXT NOT NULL DEFAULT '',
        target_hours REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE chapters (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE study_sessions (
        id TEXT PRIMARY KEY,
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
        topic TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'focus' CHECK (type IN ('focus','manual','short_break','long_break')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
        notes TEXT NOT NULL DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
        due_date TEXT,
        estimated_minutes INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        completed_at TEXT
      )`,
      `CREATE TABLE goals (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('daily_minutes','weekly_minutes','monthly_minutes','subject_minutes','session_count','chapter_count')),
        target_value REAL NOT NULL CHECK (target_value > 0),
        subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#8B7CF6',
        icon TEXT NOT NULL DEFAULT 'repeat',
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE habit_completions (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (habit_id, date)
      )`,
      `CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE study_schedules (
        id TEXT PRIMARY KEY,
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        date TEXT NOT NULL,
        start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
        end_minute INTEGER NOT NULL CHECK (end_minute > 0 AND end_minute <= 1440),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE timer_state (
        id TEXT PRIMARY KEY CHECK (id = 'active'),
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT,
        ends_at TEXT,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        remaining_seconds INTEGER NOT NULL DEFAULT 0,
        completed_focus_count INTEGER NOT NULL DEFAULT 0,
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE achievements (
        key TEXT PRIMARY KEY,
        unlocked_at TEXT NOT NULL
      )`,
      `CREATE INDEX idx_sessions_start_time ON study_sessions (start_time DESC)`,
      `CREATE INDEX idx_sessions_subject ON study_sessions (subject_id)`,
      `CREATE INDEX idx_sessions_type ON study_sessions (type)`,
      `CREATE INDEX idx_chapters_subject ON chapters (subject_id)`,
      `CREATE INDEX idx_tasks_status_due ON tasks (status, due_date)`,
      `CREATE INDEX idx_tasks_subject ON tasks (subject_id)`,
      `CREATE INDEX idx_habit_completions_date ON habit_completions (date)`,
      `CREATE INDEX idx_notes_updated ON notes (updated_at DESC)`,
      `CREATE INDEX idx_schedules_date ON study_schedules (date)`,
    ],
  },
]

export function currentVersion(db: Database): number {
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'`)
    .get()
  if (!table) return 0
  const row = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as { version: number | null }
  return row.version ?? 0
}

export function runMigrations(db: Database): number {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`)
  let applied = 0
  for (const migration of MIGRATIONS) {
    const done = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(migration.version)
    if (done) continue
    const apply = db.transaction(() => {
      for (const statement of migration.up) db.exec(statement)
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      )
    })
    apply()
    applied += 1
  }
  return applied
}
