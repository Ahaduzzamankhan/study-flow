import { copyFile, mkdir, stat, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface BackupManifest {
  app: string
  version: number
  createdAt: string
}

export async function backupDatabase(db: { backup: (path: string) => Promise<unknown> }, destination: string): Promise<string> {
  await mkdir(dirname(destination), { recursive: true })
  await db.backup(destination)
  return destination
}

export async function restoreDatabaseFile(source: string, target: string): Promise<void> {
  const info = await stat(source)
  if (!info.isFile() || info.size < 1024) {
    throw new Error('The selected file is not a valid StudyFlow database.')
  }
  await copyFile(source, target)
  await Promise.all([rm(`${target}-wal`, { force: true }), rm(`${target}-shm`, { force: true })])
}

export function defaultBackupName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `studyflow-backup-${stamp}.sqlite`
}

export function backupDirectory(userDataPath: string): string {
  return join(userDataPath, 'backups')
}
