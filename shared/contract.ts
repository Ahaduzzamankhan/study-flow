import { z } from 'zod'

const id = z.string().min(1).max(80)
const isoDateTime = z.string().min(4).max(40)
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a hex colour')
const shortName = z.string().trim().min(1).max(120)
const longText = z.string().max(50_000)
const optionalId = id.nullable()

export const timerSettingsSchema = z.object({
  focusMinutes: z.number().int().min(1).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  longBreakInterval: z.number().int().min(2).max(12),
  autoStartBreaks: z.boolean(),
  autoStartFocus: z.boolean(),
  sound: z.boolean(),
  volume: z.number().min(0).max(1),
  notifications: z.boolean(),
  preset: z.enum(['classic', 'deep', 'sprint', 'custom']),
})

export const appSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  accent: z.string().min(1).max(24),
  reducedMotion: z.boolean(),
  animatedBackground: z.boolean(),
  language: z.literal('en'),
  userName: z.string().max(60),
  sidebarCollapsed: z.boolean(),
  startMinimizedToTray: z.boolean(),
  closeToTray: z.boolean(),
  launchAtStartup: z.boolean(),
  dashboardWidgets: z.array(z.string().max(40)).max(30),
  quotes: z.boolean(),
  gamification: z.boolean(),
  timer: timerSettingsSchema,
})

export const timerStateSchema = z.object({
  mode: z.enum(['focus', 'short_break', 'long_break']),
  status: z.enum(['idle', 'running', 'paused']),
  startedAt: isoDateTime.nullable(),
  endsAt: isoDateTime.nullable(),
  durationSeconds: z.number().int().min(0).max(86_400),
  remainingSeconds: z.number().int().min(0).max(86_400),
  completedFocusCount: z.number().int().min(0).max(10_000),
  subjectId: optionalId,
  taskId: optionalId,
  updatedAt: isoDateTime,
})

const subjectFields = {
  name: shortName,
  color,
  icon: z.string().min(1).max(40),
  description: longText,
  targetHours: z.number().min(0).max(10_000),
}

const taskFields = {
  title: shortName,
  description: longText,
  subjectId: optionalId,
  chapterId: optionalId,
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: dateOnly.nullable(),
  estimatedMinutes: z.number().int().min(0).max(10_000),
  status: z.enum(['todo', 'in_progress', 'done']),
  notes: longText,
}

const sessionFields = {
  subjectId: optionalId,
  chapterId: optionalId,
  topic: z.string().max(160),
  type: z.enum(['focus', 'manual', 'short_break', 'long_break']),
  startTime: isoDateTime,
  endTime: isoDateTime,
  durationSeconds: z.number().int().min(0).max(86_400),
  notes: longText,
  completed: z.boolean(),
}

const goalFields = {
  type: z.enum(['daily_minutes', 'weekly_minutes', 'monthly_minutes', 'subject_minutes', 'session_count', 'chapter_count']),
  targetValue: z.number().min(1).max(1_000_000),
  subjectId: optionalId,
  archived: z.boolean().optional(),
}

const habitFields = {
  name: shortName,
  description: longText,
  color,
  icon: z.string().min(1).max(40),
}

const noteFields = {
  title: shortName,
  content: longText,
  subjectId: optionalId,
  pinned: z.boolean(),
}

const scheduleFields = {
  subjectId: optionalId,
  taskId: optionalId,
  date: dateOnly,
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  note: z.string().max(300),
}

/**
 * Every IPC channel the renderer may call, with its argument schema.
 * The main process rejects anything not present here and validates the payload
 * before a handler runs.
 */
export const channelSchemas = {
  'app.info': z.object({}).default({}),
  'app.openExternal': z.object({ url: z.string().url().startsWith('https://') }),
  'app.checkUpdates': z.object({}).default({}),
  'app.setLaunchAtStartup': z.object({ enabled: z.boolean() }),
  'window.setFullScreen': z.object({ value: z.boolean() }),
  'notify.show': z.object({ title: z.string().min(1).max(120), body: z.string().min(1).max(400) }),

  'settings.get': z.object({}).default({}),
  'settings.update': z.object({ patch: appSettingsSchema.partial() }),

  'subjects.list': z.object({}).default({}),
  'subjects.create': z.object(subjectFields),
  'subjects.update': z.object({ id, patch: z.object(subjectFields).partial() }),
  'subjects.remove': z.object({ id }),

  'chapters.list': z.object({ subjectId: optionalId.default(null) }).default({ subjectId: null }),
  'chapters.create': z.object({ subjectId: id, title: shortName, status: z.enum(['pending', 'completed']).default('pending') }),
  'chapters.update': z.object({
    id,
    patch: z
      .object({ title: shortName, status: z.enum(['pending', 'completed']), position: z.number().int().min(0) })
      .partial(),
  }),
  'chapters.remove': z.object({ id }),

  'sessions.list': z
    .object({
      from: isoDateTime.optional(),
      to: isoDateTime.optional(),
      subjectId: id.optional(),
      search: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(5000).optional(),
    })
    .default({}),
  'sessions.create': z.object(sessionFields),
  'sessions.update': z.object({ id, patch: z.object(sessionFields).partial() }),
  'sessions.remove': z.object({ id }),

  'tasks.list': z.object({}).default({}),
  'tasks.create': z.object(taskFields),
  'tasks.update': z.object({ id, patch: z.object(taskFields).partial() }),
  'tasks.remove': z.object({ id }),

  'goals.list': z.object({}).default({}),
  'goals.create': z.object(goalFields),
  'goals.update': z.object({ id, patch: z.object(goalFields).partial() }),
  'goals.remove': z.object({ id }),

  'habits.list': z.object({}).default({}),
  'habits.create': z.object(habitFields),
  'habits.update': z.object({ id, patch: z.object(habitFields).partial() }),
  'habits.remove': z.object({ id }),
  'habits.toggle': z.object({ habitId: id, date: dateOnly }),

  'notes.list': z.object({}).default({}),
  'notes.create': z.object(noteFields),
  'notes.update': z.object({ id, patch: z.object(noteFields).partial() }),
  'notes.remove': z.object({ id }),

  'schedules.list': z.object({ from: dateOnly, to: dateOnly }),
  'schedules.create': z.object(scheduleFields),
  'schedules.update': z.object({ id, patch: z.object(scheduleFields).partial() }),
  'schedules.remove': z.object({ id }),

  'timer.get': z.object({}).default({}),
  'timer.save': z.object({ state: timerStateSchema }),
  'timer.clear': z.object({}).default({}),

  'stats.overview': z.object({}).default({}),
  'stats.heatmap': z.object({ from: dateOnly, to: dateOnly }),
  'stats.daily': z.object({ from: dateOnly, to: dateOnly }),
  'stats.analytics': z.object({}).default({}),
  'stats.subjects': z.object({}).default({}),
  'stats.goals': z.object({}).default({}),
  'stats.habits': z.object({}).default({}),
  'stats.achievements': z.object({}).default({}),

  'data.export': z.object({ format: z.enum(['csv', 'json']) }),
  'data.backup': z.object({}),
  'data.restore': z.object({ confirm: z.literal(true) }),
  'data.clear': z.object({ confirm: z.literal(true) }),
} as const

export type Channel = keyof typeof channelSchemas
export type ChannelInput<C extends Channel> = z.input<(typeof channelSchemas)[C]>
export type ChannelArgs<C extends Channel> = z.output<(typeof channelSchemas)[C]>

export const CHANNELS = Object.keys(channelSchemas) as Channel[]

export function isChannel(value: string): value is Channel {
  return Object.prototype.hasOwnProperty.call(channelSchemas, value)
}

export function validatePayload<C extends Channel>(channel: C, payload: unknown): ChannelArgs<C> {
  const schema = channelSchemas[channel] as z.ZodType<ChannelArgs<C>>
  return schema.parse(payload ?? {})
}
