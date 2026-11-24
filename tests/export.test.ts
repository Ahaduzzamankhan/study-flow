import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../electron/database'
import { createNote, createSession, createSubject, listNotes } from '../electron/database/repositories'
import { clearAllData, databaseToJson, sessionsToCsv, summarizeDatabase } from '../electron/services/export'
import { defaultBackupName } from '../electron/services/backup'
import { compareVersions } from '../shared/version'

const iso = (offsetMinutes: number): string => new Date(Date.now() + offsetMinutes * 60_000).toISOString()

function seed(): ReturnType<typeof createTestDatabase> {
  const db = createTestDatabase()
  const subject = createSubject(db, { name: 'History', color: '#F8A96E', icon: 'globe', description: '', targetHours: 5 })
  createSession(db, {
    subjectId: subject.id,
    chapterId: null,
    topic: 'Industrial revolution, "phase two"',
    type: 'focus',
    startTime: iso(-60),
    endTime: iso(-30),
    durationSeconds: 1800,
    notes: 'Line one\nLine two',
    completed: true,
  })
  createNote(db, { title: 'Essay plan', content: '# Outline', subjectId: subject.id, pinned: false })
  return db
}

describe('CSV export', () => {
  it('escapes commas, quotes and newlines', () => {
    const db = seed()
    const { csv, rows } = sessionsToCsv(db)
    expect(rows).toBe(1)
    expect(csv.startsWith('id,date,start_time')).toBe(true)
    expect(csv).toContain('"Industrial revolution, ""phase two"""')
    expect(csv).toContain('"Line one\nLine two"')
  })
})

describe('JSON export', () => {
  it('contains every collection', () => {
    const db = seed()
    const dump = databaseToJson(db)
    expect(dump.app).toBe('StudyFlow')
    expect((dump.sessions as unknown[]).length).toBe(1)
    expect((dump.subjects as unknown[]).length).toBe(1)
    expect((dump.notes as unknown[]).length).toBe(1)
    expect(dump.settings).toBeTruthy()
  })
})

describe('data management', () => {
  it('summarises and clears all data', () => {
    const db = seed()
    expect(summarizeDatabase(db).sessions).toBe(1)
    clearAllData(db)
    const summary = summarizeDatabase(db)
    expect(Object.values(summary).every((count) => count === 0)).toBe(true)
    expect(listNotes(db)).toHaveLength(0)
  })

  it('names backups with a sortable timestamp', () => {
    const name = defaultBackupName(new Date('2026-05-20T10:11:12Z'))
    expect(name).toBe('studyflow-backup-2026-05-20-10-11-12.sqlite')
  })
})

describe('version comparison', () => {
  it('orders semantic versions', () => {
    expect(compareVersions('1.2.0', '1.1.9')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('0.9', '1.0.0')).toBeLessThan(0)
  })
})
