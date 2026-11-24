export type Priority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type SessionType = 'focus' | 'manual' | 'short_break' | 'long_break'
export type ChapterStatus = 'pending' | 'completed'
export type TimerMode = 'focus' | 'short_break' | 'long_break'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type ThemeMode = 'light' | 'dark' | 'system'
export type GoalType =
  | 'daily_minutes'
  | 'weekly_minutes'
  | 'monthly_minutes'
  | 'subject_minutes'
  | 'session_count'
  | 'chapter_count'

export interface Subject {
  id: string
  name: string
  color: string
  icon: string
  description: string
  targetHours: number
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  subjectId: string
  title: string
  status: ChapterStatus
  position: number
  createdAt: string
}

export interface StudySession {
  id: string
  subjectId: string | null
  chapterId: string | null
  topic: string
  type: SessionType
  startTime: string
  endTime: string
  durationSeconds: number
  notes: string
  completed: boolean
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  subjectId: string | null
  chapterId: string | null
  priority: Priority
  dueDate: string | null
  estimatedMinutes: number
  status: TaskStatus
  notes: string
  createdAt: string
  completedAt: string | null
}

export interface Goal {
  id: string
  type: GoalType
  targetValue: number
  subjectId: string | null
  createdAt: string
  archived: boolean
}

export interface Habit {
  id: string
  name: string
  description: string
  color: string
  icon: string
  archived: boolean
  createdAt: string
}

export interface HabitCompletion {
  id: string
  habitId: string
  date: string
  createdAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  subjectId: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface StudySchedule {
  id: string
  subjectId: string | null
  taskId: string | null
  date: string
  startMinute: number
  endMinute: number
  note: string
  createdAt: string
}

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  startedAt: string | null
  endsAt: string | null
  durationSeconds: number
  remainingSeconds: number
  completedFocusCount: number
  subjectId: string | null
  taskId: string | null
  updatedAt: string
}

export interface TimerSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  sound: boolean
  volume: number
  notifications: boolean
  preset: 'classic' | 'deep' | 'sprint' | 'custom'
}

export interface AppSettings {
  theme: ThemeMode
  accent: string
  reducedMotion: boolean
  animatedBackground: boolean
  language: 'en'
  userName: string
  sidebarCollapsed: boolean
  startMinimizedToTray: boolean
  closeToTray: boolean
  launchAtStartup: boolean
  dashboardWidgets: string[]
  quotes: boolean
  gamification: boolean
  timer: TimerSettings
}

export interface AchievementState {
  key: string
  title: string
  description: string
  xp: number
  icon: string
  unlockedAt: string | null
  progress: number
  target: number
}

export interface LevelInfo {
  xp: number
  level: number
  levelXp: number
  nextLevelXp: number
  progress: number
}

export interface OverviewStats {
  todaySeconds: number
  todaySessions: number
  streak: number
  longestStreak: number
  weekSeconds: number
  monthSeconds: number
  totalSeconds: number
  totalSessions: number
  completedTasks: number
  openTasks: number
  goalCompletion: number
  todayGoalMinutes: number
  focusSeconds: number
  breakSeconds: number
  subjectCount: number
  noteCount: number
  level: LevelInfo
}

export interface DayTotal {
  date: string
  seconds: number
  sessions: number
}

export interface SubjectTotal {
  subjectId: string
  name: string
  color: string
  seconds: number
  sessions: number
}

export interface AnalyticsSummary {
  totalSeconds: number
  dailyAverage: number
  weeklyAverage: number
  monthlyAverage: number
  longestSessionSeconds: number
  mostStudiedSubject: SubjectTotal | null
  mostProductiveDay: DayTotal | null
  completionRate: number
  focusSeconds: number
  breakSeconds: number
  activeDays: number
  streakHistory: { date: string; seconds: number }[]
}

export interface GoalProgress {
  goal: Goal
  current: number
  target: number
  percent: number
  periodLabel: string
  subjectName: string | null
}

export interface HabitWithHistory extends Habit {
  completions: string[]
  streak: number
  completionRate: number
}

export interface AppInfo {
  version: string
  name: string
  platform: string
  databasePath: string
  electron: string
  chrome: string
  node: string
  repositoryUrl: string
  userDataPath: string
}

export interface ExportResult {
  canceled: boolean
  path?: string
  rows?: number
}

export interface BackupResult {
  canceled: boolean
  path?: string
}
