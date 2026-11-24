import BetterSqlite3, { type Database } from 'better-sqlite3'
import { runMigrations } from './migrations'

export type DB = Database

/**
 * Opens (and creates) the StudyFlow database, enabling WAL, foreign keys and
 * a busy timeout, then applies pending migrations.
 */
export function openDatabase(file: string): DB {
  const db = new BetterSqlite3(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = NORMAL')
  runMigrations(db)
  return db
}

export function createTestDatabase(): DB {
  const db = new BetterSqlite3(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}
