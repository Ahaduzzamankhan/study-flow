import { BrowserWindow, dialog, ipcMain, Notification, app, shell } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DB } from '../database'
import {
  archiveHabit,
  clearAchievements,
  listChapters,
  listGoals,
  listHabits,
  listNotes,
  listSessions,
  listTasks,
  clearTimerState,
  createChapter,
  createGoal,
  createHabit,
  createNote,
  createSchedule,
  createSession,
  createSubject,
  createTask,
  deleteChapter,
  deleteGoal,
  deleteNote,
  deleteSchedule,
  deleteSession,
  deleteSubject,
  deleteTask,
  getSettings,
  getTimerState,
  listSubjects,
  listSchedules,
  saveTimerState,
  toggleHabitCompletion,
  updateChapter,
  updateGoal,
  updateHabit,
  updateNote,
  updateSchedule,
  updateSession,
  updateSettings,
  updateSubject,
  updateTask,
} from '../database/repositories'
import {
  achievementsState,
  analytics,
  dailyTotals,
  goalProgress,
  habitsWithHistory,
  heatmap,
  overview,
  subjectTotals,
} from '../database/stats'
import { isChannel, validatePayload, type Channel } from '../../shared/contract'
import { compareVersions } from '../../shared/version'
import type { AppInfo } from '../../shared/types'
import { backupDatabase, defaultBackupName, restoreDatabaseFile } from '../services/backup'
import { clearAllData, databaseToJson, sessionsToCsv } from '../services/export'

export interface IpcContext {
  db: DB
  dbPath: string
  userDataPath: string
  appInfo: () => AppInfo
  reopenDatabase: () => void
  applyLaunchAtStartup: (enabled: boolean) => void
  setFullScreen: (value: boolean) => void
  hasTrustedSender: (senderUrl: string) => boolean
}

// Handlers are validated by the channel contract before they are called, so the
// argument type is intentionally loose at this boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (args: any, sender: Electron.WebContents) => unknown

function windowFor(sender: Electron.WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender)
}

export function registerIpcHandlers(ctx: IpcContext): void {
  const requireWindow = (sender: Electron.WebContents): BrowserWindow => {
    const win = windowFor(sender)
    if (!win) throw new Error('No application window is available for this action.')
    return win
  }

  const handlers: Record<Channel, Handler> = {
    'app.info': () => ctx.appInfo(),
    'app.openExternal': (args: { url: string }) => {
      if (!args.url.startsWith('https://')) throw new Error('Only https links can be opened.')
      void shell.openExternal(args.url)
      return true
    },
    'app.checkUpdates': async () => {
      const current = app.getVersion()
      const latest = await fetchLatestVersion()
      return {
        current,
        latest,
        updateAvailable: latest !== null && compareVersions(latest, current) > 0,
        releasesUrl: 'https://github.com/Ahaduzzamankhan/study-flow/releases',
      }
    },
    'app.setLaunchAtStartup': (args: { enabled: boolean }) => {
      ctx.applyLaunchAtStartup(args.enabled)
      return true
    },
    'window.setFullScreen': (args: { value: boolean }) => {
      ctx.setFullScreen(args.value)
      return true
    },
    'notify.show': (args: { title: string; body: string }) => {
      if (Notification.isSupported()) {
        const settings = getSettings(ctx.db)
        if (settings.timer.notifications) {
          new Notification({ title: args.title, body: args.body, silent: !settings.timer.sound }).show()
        }
      }
      return true
    },

    'settings.get': () => getSettings(ctx.db),
    'settings.update': (args: { patch: Record<string, unknown> }) => updateSettings(ctx.db, args.patch as never),

    'subjects.list': () => listSubjects(ctx.db),
    'subjects.create': (args: any) => createSubject(ctx.db, args),
    'subjects.update': (args: { id: string; patch: never }) => updateSubject(ctx.db, args.id, args.patch),
    'subjects.remove': (args: { id: string }) => {
      deleteSubject(ctx.db, args.id)
      return true
    },

    'chapters.list': (args: { subjectId: string | null }) => listChapters(ctx.db, args.subjectId),
    'chapters.create': (args: any) => createChapter(ctx.db, args),
    'chapters.update': (args: { id: string; patch: never }) => updateChapter(ctx.db, args.id, args.patch),
    'chapters.remove': (args: { id: string }) => {
      deleteChapter(ctx.db, args.id)
      return true
    },

    'sessions.list': (args: any) => listSessions(ctx.db, args),
    'sessions.create': (args: any) => createSession(ctx.db, args),
    'sessions.update': (args: { id: string; patch: never }) => updateSession(ctx.db, args.id, args.patch),
    'sessions.remove': (args: { id: string }) => {
      deleteSession(ctx.db, args.id)
      return true
    },

    'tasks.list': () => listTasks(ctx.db),
    'tasks.create': (args: any) => createTask(ctx.db, args),
    'tasks.update': (args: { id: string; patch: never }) => updateTask(ctx.db, args.id, args.patch),
    'tasks.remove': (args: { id: string }) => {
      deleteTask(ctx.db, args.id)
      return true
    },

    'goals.list': () => listGoals(ctx.db),
    'goals.create': (args: any) => createGoal(ctx.db, args),
    'goals.update': (args: { id: string; patch: never }) => updateGoal(ctx.db, args.id, args.patch),
    'goals.remove': (args: { id: string }) => {
      deleteGoal(ctx.db, args.id)
      return true
    },

    'habits.list': () => listHabits(ctx.db),
    'habits.create': (args: any) => createHabit(ctx.db, args),
    'habits.update': (args: { id: string; patch: never }) => updateHabit(ctx.db, args.id, args.patch),
    'habits.remove': (args: { id: string }) => {
      archiveHabit(ctx.db, args.id)
      return true
    },
    'habits.toggle': (args: { habitId: string; date: string }) => ({
      completed: toggleHabitCompletion(ctx.db, args.habitId, args.date),
    }),

    'notes.list': () => listNotes(ctx.db),
    'notes.create': (args: any) => createNote(ctx.db, args),
    'notes.update': (args: { id: string; patch: never }) => updateNote(ctx.db, args.id, args.patch),
    'notes.remove': (args: { id: string }) => {
      deleteNote(ctx.db, args.id)
      return true
    },

    'schedules.list': (args: { from: string; to: string }) => listSchedules(ctx.db, args.from, args.to),
    'schedules.create': (args: any) => createSchedule(ctx.db, args),
    'schedules.update': (args: { id: string; patch: never }) => updateSchedule(ctx.db, args.id, args.patch),
    'schedules.remove': (args: { id: string }) => {
      deleteSchedule(ctx.db, args.id)
      return true
    },

    'timer.get': () => getTimerState(ctx.db),
    'timer.save': (args: { state: never }) => saveTimerState(ctx.db, args.state),
    'timer.clear': () => {
      clearTimerState(ctx.db)
      return true
    },

    'stats.overview': () => overview(ctx.db),
    'stats.heatmap': (args: { from: string; to: string }) => heatmap(ctx.db, args.from, args.to),
    'stats.daily': (args: { from: string; to: string }) => dailyTotals(ctx.db, args.from, args.to),
    'stats.analytics': () => analytics(ctx.db),
    'stats.subjects': () => subjectTotals(ctx.db),
    'stats.goals': () => goalProgress(ctx.db),
    'stats.habits': () => habitsWithHistory(ctx.db),
    'stats.achievements': () => achievementsState(ctx.db),

    'data.export': async (args: { format: 'csv' | 'json' }, sender: Electron.WebContents) => {
      const win = requireWindow(sender)
      const stamp = new Date().toISOString().slice(0, 10)
      const isCsv = args.format === 'csv'
      const result = await dialog.showSaveDialog(win, {
        title: isCsv ? 'Export study sessions as CSV' : 'Export StudyFlow data as JSON',
        defaultPath: join(app.getPath('documents'), `studyflow-${stamp}.${isCsv ? 'csv' : 'json'}`),
        filters: isCsv ? [{ name: 'CSV', extensions: ['csv'] }] : [{ name: 'JSON', extensions: ['json'] }],
      })
      if (result.canceled || !result.filePath) return { canceled: true }
      if (isCsv) {
        const { csv, rows } = sessionsToCsv(ctx.db)
        await writeFile(result.filePath, csv, 'utf8')
        return { canceled: false, path: result.filePath, rows }
      }
      await writeFile(result.filePath, JSON.stringify(databaseToJson(ctx.db), null, 2), 'utf8')
      return { canceled: false, path: result.filePath, rows: 1 }
    },
    'data.backup': async (_args: unknown, sender: Electron.WebContents) => {
      const win = requireWindow(sender)
      const result = await dialog.showSaveDialog(win, {
        title: 'Create StudyFlow backup',
        defaultPath: join(app.getPath('documents'), defaultBackupName()),
        filters: [{ name: 'StudyFlow database', extensions: ['sqlite'] }],
      })
      if (result.canceled || !result.filePath) return { canceled: true }
      await backupDatabase(ctx.db, result.filePath)
      return { canceled: false, path: result.filePath }
    },
    'data.restore': async (_args: unknown, sender: Electron.WebContents) => {
      const win = requireWindow(sender)
      const result = await dialog.showOpenDialog(win, {
        title: 'Restore StudyFlow backup',
        properties: ['openFile'],
        filters: [{ name: 'StudyFlow database', extensions: ['sqlite', 'db'] }],
      })
      const source = result.filePaths[0]
      if (result.canceled || !source) return { canceled: true }
      const confirm = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['Cancel', 'Restore backup'],
        defaultId: 0,
        cancelId: 0,
        title: 'Restore backup',
        message: 'Replace the current StudyFlow data with this backup?',
        detail: 'Your current study history will be overwritten. Create a backup first if you might need it.',
      })
      if (confirm.response !== 1) return { canceled: true }
      ctx.db.close()
      await restoreDatabaseFile(source, ctx.dbPath)
      ctx.reopenDatabase()
      return { canceled: false, path: source }
    },
    'data.clear': async (_args: unknown, sender: Electron.WebContents) => {
      const win = requireWindow(sender)
      const confirm = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['Cancel', 'Delete everything'],
        defaultId: 0,
        cancelId: 0,
        title: 'Clear application data',
        message: 'Delete all StudyFlow study data?',
        detail: 'Subjects, sessions, tasks, goals, habits, notes and settings will be permanently removed. This cannot be undone.',
      })
      if (confirm.response !== 1) return { cleared: false }
      clearAllData(ctx.db)
      clearAchievements(ctx.db)
      return { cleared: true }
    },
  }

  ipcMain.handle('studyflow:invoke', async (event, rawChannel: unknown, payload: unknown) => {
    try {
      if (typeof rawChannel !== 'string' || !isChannel(rawChannel)) {
        throw new Error('Unknown IPC channel.')
      }
      if (!ctx.hasTrustedSender(event.senderFrame?.url ?? '')) {
        throw new Error('Rejected IPC call from an untrusted frame.')
      }
      const args = validatePayload(rawChannel, payload)
      const handler = handlers[rawChannel]
      const data = await handler(args, event.sender)
      return { ok: true as const, data: data ?? null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error'
      return { ok: false as const, error: message }
    }
  })
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch('https://api.github.com/repos/Ahaduzzamankhan/study-flow/releases/latest', {
      headers: { accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { tag_name?: string }
    return body.tag_name ? body.tag_name.replace(/^v/, '') : null
  } catch {
    return null
  }
}

