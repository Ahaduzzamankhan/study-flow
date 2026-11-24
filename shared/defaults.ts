import type { AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  accent: 'lavender',
  reducedMotion: false,
  animatedBackground: true,
  language: 'en',
  userName: '',
  sidebarCollapsed: false,
  startMinimizedToTray: false,
  closeToTray: true,
  launchAtStartup: false,
  dashboardWidgets: ['continue', 'heatmap', 'weekly', 'subjects', 'upcoming', 'schedule', 'recent', 'goals', 'achievements', 'quote'],
  quotes: true,
  gamification: true,
  timer: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4,
    autoStartBreaks: true,
    autoStartFocus: false,
    sound: true,
    volume: 0.6,
    notifications: true,
    preset: 'classic',
  },
}

export const ACCENTS: Record<string, { label: string; hue: string; primary: string; soft: string }> = {
  lavender: { label: 'Lavender Dream', hue: '#8B7CF6', primary: '#6D5BD0', soft: '#EDE8FF' },
  sky: { label: 'Sky Ribbon', hue: '#6CB8F6', primary: '#2E86D8', soft: '#E4F2FF' },
  sakura: { label: 'Sakura Bloom', hue: '#F48FB6', primary: '#D9558A', soft: '#FFE8F1' },
  mint: { label: 'Matcha Mint', hue: '#6FD3B6', primary: '#2E9E80', soft: '#E2FAF2' },
  peach: { label: 'Peach Soda', hue: '#F8A96E', primary: '#D4783B', soft: '#FFF0E2' },
  midnight: { label: 'Midnight Navy', hue: '#5B6BC0', primary: '#3E4C9A', soft: '#E8EAFA' },
}

export const WIDGET_LABELS: Record<string, string> = {
  continue: 'Continue studying',
  heatmap: 'Study activity heatmap',
  weekly: 'Weekly study duration',
  subjects: 'Subject distribution',
  upcoming: 'Upcoming tasks',
  schedule: "Today's schedule",
  recent: 'Recent sessions',
  goals: 'Active goals',
  achievements: 'Achievements',
  quote: 'Daily motivation',
}

export const MOTIVATION_QUOTES = [
  'Small steps every day build the future you are studying for.',
  'You do not have to be perfect today, only a little further than yesterday.',
  'Focus on the next chapter, not the whole book.',
  'Discipline is remembering what you actually want.',
  'A twenty-five minute session beats an hour of good intentions.',
  'Your future self is already proud of the page you are on.',
  'Progress hides in ordinary afternoons.',
  'Rest is part of the method, not a break from it.',
]
