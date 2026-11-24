import type {
  AchievementState,
  AnalyticsSummary,
  AppInfo,
  AppSettings,
  BackupResult,
  Chapter,
  DayTotal,
  ExportResult,
  Goal,
  GoalProgress,
  Habit,
  HabitWithHistory,
  Note,
  OverviewStats,
  StudySchedule,
  StudySession,
  Subject,
  SubjectTotal,
  Task,
  TimerState,
} from '@shared/types'
import type { Channel, ChannelInput } from '@shared/contract'
import { createDevBridge } from './devBridge'

export interface Bridge {
  platform: string
  invoke: (channel: string, payload?: unknown) => Promise<unknown>
  onMenuAction: (listener: (action: string) => void) => () => void
  onWindowState: (listener: (state: { focused: boolean }) => void) => () => void
}

declare global {
  interface Window {
    studyflow?: Bridge
  }
}

let devBridge: Bridge | null = null

export function getBridge(): Bridge {
  if (typeof window !== 'undefined' && window.studyflow) return window.studyflow
  if (import.meta.env.DEV) {
    devBridge ??= createDevBridge()
    return devBridge
  }
  throw new Error('StudyFlow could not reach the desktop process. Start the app with "npm start".')
}

export function hasDesktopBridge(): boolean {
  return typeof window !== 'undefined' && Boolean(window.studyflow)
}

async function invoke<T>(channel: Channel, payload?: unknown): Promise<T> {
  return (await getBridge().invoke(channel, payload)) as T
}

export type SubjectInput = Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>
export type SessionInput = Omit<StudySession, 'id' | 'createdAt'>
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'completedAt'>
export type NoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
export type ScheduleInput = Omit<StudySchedule, 'id' | 'createdAt'>
export type HabitInput = Omit<Habit, 'id' | 'archived' | 'createdAt'>

export const api = {
  app: {
    info: () => invoke<AppInfo>('app.info'),
    openExternal: (url: string) => invoke<boolean>('app.openExternal', { url }),
    checkUpdates: () =>
      invoke<{ current: string; latest: string | null; updateAvailable: boolean; releasesUrl: string }>('app.checkUpdates'),
    setLaunchAtStartup: (enabled: boolean) => invoke<boolean>('app.setLaunchAtStartup', { enabled }),
    setFullScreen: (value: boolean) => invoke<boolean>('window.setFullScreen', { value }),
    notify: (title: string, body: string) => invoke<boolean>('notify.show', { title, body }),
  },
  settings: {
    get: () => invoke<AppSettings>('settings.get'),
    update: (patch: Partial<AppSettings>) => invoke<AppSettings>('settings.update', { patch }),
  },
  subjects: {
    list: () => invoke<Subject[]>('subjects.list'),
    create: (input: SubjectInput) => invoke<Subject>('subjects.create', input),
    update: (id: string, patch: Partial<SubjectInput>) => invoke<Subject>('subjects.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('subjects.remove', { id }),
  },
  chapters: {
    list: (subjectId: string | null = null) => invoke<Chapter[]>('chapters.list', { subjectId }),
    create: (subjectId: string, title: string, status: 'pending' | 'completed' = 'pending') =>
      invoke<Chapter>('chapters.create', { subjectId, title, status }),
    update: (id: string, patch: { title?: string; status?: 'pending' | 'completed'; position?: number }) =>
      invoke<Chapter>('chapters.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('chapters.remove', { id }),
  },
  sessions: {
    list: (filter: { from?: string; to?: string; subjectId?: string; search?: string; limit?: number } = {}) =>
      invoke<StudySession[]>('sessions.list', filter),
    create: (input: SessionInput) => invoke<StudySession>('sessions.create', input),
    update: (id: string, patch: Partial<SessionInput>) => invoke<StudySession>('sessions.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('sessions.remove', { id }),
  },
  tasks: {
    list: () => invoke<Task[]>('tasks.list'),
    create: (input: TaskInput) => invoke<Task>('tasks.create', input),
    update: (id: string, patch: Partial<TaskInput>) => invoke<Task>('tasks.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('tasks.remove', { id }),
  },
  goals: {
    list: () => invoke<Goal[]>('goals.list'),
    create: (input: { type: Goal['type']; targetValue: number; subjectId: string | null }) => invoke<Goal>('goals.create', input),
    update: (id: string, patch: Partial<Pick<Goal, 'type' | 'targetValue' | 'subjectId' | 'archived'>>) =>
      invoke<Goal>('goals.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('goals.remove', { id }),
  },
  habits: {
    list: () => invoke<Habit[]>('habits.list'),
    create: (input: HabitInput) => invoke<Habit>('habits.create', input),
    update: (id: string, patch: Partial<HabitInput>) => invoke<Habit>('habits.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('habits.remove', { id }),
    toggle: (habitId: string, date: string) => invoke<{ completed: boolean }>('habits.toggle', { habitId, date }),
  },
  notes: {
    list: () => invoke<Note[]>('notes.list'),
    create: (input: NoteInput) => invoke<Note>('notes.create', input),
    update: (id: string, patch: Partial<NoteInput>) => invoke<Note>('notes.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('notes.remove', { id }),
  },
  schedules: {
    list: (from: string, to: string) => invoke<StudySchedule[]>('schedules.list', { from, to }),
    create: (input: ScheduleInput) => invoke<StudySchedule>('schedules.create', input),
    update: (id: string, patch: Partial<ScheduleInput>) => invoke<StudySchedule>('schedules.update', { id, patch }),
    remove: (id: string) => invoke<boolean>('schedules.remove', { id }),
  },
  timer: {
    get: () => invoke<TimerState>('timer.get'),
    save: (state: TimerState) => invoke<TimerState>('timer.save', { state }),
    clear: () => invoke<boolean>('timer.clear'),
  },
  stats: {
    overview: () => invoke<OverviewStats>('stats.overview'),
    heatmap: (from: string, to: string) => invoke<Record<string, number>>('stats.heatmap', { from, to }),
    daily: (from: string, to: string) => invoke<DayTotal[]>('stats.daily', { from, to }),
    analytics: () => invoke<AnalyticsSummary>('stats.analytics'),
    subjects: () => invoke<SubjectTotal[]>('stats.subjects'),
    goals: () => invoke<GoalProgress[]>('stats.goals'),
    habits: () => invoke<HabitWithHistory[]>('stats.habits'),
    achievements: () => invoke<AchievementState[]>('stats.achievements'),
  },
  data: {
    exportData: (format: 'csv' | 'json') => invoke<ExportResult>('data.export', { format }),
    backup: () => invoke<BackupResult>('data.backup'),
    restore: () => invoke<BackupResult>('data.restore', { confirm: true }),
    clear: () => invoke<{ cleared: boolean }>('data.clear', { confirm: true }),
  },
}

export type Api = typeof api
export type { Channel, ChannelInput }
