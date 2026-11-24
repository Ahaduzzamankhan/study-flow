import { create } from 'zustand'
import { api } from '@/lib/api'
import { durationForMode, nextMode, remainingSeconds } from '@/lib/timer'
import { playChime } from '@/lib/sound'
import { useAppStore } from './appStore'
import { toast } from './toastStore'
import type { TimerMode, TimerState } from '@shared/types'

interface TimerStore {
  state: TimerState
  remaining: number
  subjectId: string | null
  taskId: string | null
  loaded: boolean
  finishing: boolean
  load: () => Promise<void>
  setSubject: (id: string | null) => Promise<void>
  setTask: (id: string | null) => Promise<void>
  start: (mode?: TimerMode) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  reset: () => Promise<void>
  skip: () => Promise<void>
  tick: () => void
  complete: (opts?: { natural?: boolean }) => Promise<void>
}

const initial: TimerState = {
  mode: 'focus',
  status: 'idle',
  startedAt: null,
  endsAt: null,
  durationSeconds: 0,
  remainingSeconds: 0,
  completedFocusCount: 0,
  subjectId: null,
  taskId: null,
  updatedAt: new Date(0).toISOString(),
}

let knownUnlocked: Set<string> | null = null

async function celebrateAchievements(): Promise<void> {
  const settings = useAppStore.getState().settings
  if (!settings.gamification) return
  try {
    const states = await api.stats.achievements()
    const unlocked = states.filter((s) => s.unlockedAt)
    if (knownUnlocked === null) {
      knownUnlocked = new Set(unlocked.map((s) => s.key))
      return
    }
    for (const item of unlocked) {
      if (knownUnlocked.has(item.key)) continue
      knownUnlocked.add(item.key)
      toast.achievement(`Achievement unlocked: ${item.title}`, item.description)
      if (settings.timer.notifications) {
        void api.app.notify('Achievement unlocked', `${item.title} — ${item.description}`)
      }
    }
  } catch {
    // Achievement refresh is best-effort and must never block the timer.
  }
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  state: initial,
  remaining: 0,
  subjectId: null,
  taskId: null,
  loaded: false,
  finishing: false,

  load: async () => {
    const settings = useAppStore.getState().settings
    try {
      const stored = await api.timer.get()
      if (stored.status === 'idle' || stored.durationSeconds === 0) {
        const duration = durationForMode(stored.mode ?? 'focus', settings.timer)
        set({
          state: { ...stored, durationSeconds: duration, remainingSeconds: duration },
          remaining: duration,
          subjectId: stored.subjectId,
          taskId: stored.taskId,
          loaded: true,
        })
        return
      }
      if (stored.subjectId) {
        const subjects = await api.subjects.list()
        if (!subjects.some((s) => s.id === stored.subjectId)) stored.subjectId = null
      }
      set({
        state: stored,
        remaining: remainingSeconds(stored),
        subjectId: stored.subjectId,
        taskId: stored.taskId,
        loaded: true,
      })
      if (stored.status === 'running' && remainingSeconds(stored) === 0) {
        await get().complete({ natural: true })
      } else {
        await celebrateAchievements()
      }
    } catch {
      const duration = durationForMode('focus', settings.timer)
      set({ state: { ...initial, durationSeconds: duration, remainingSeconds: duration }, remaining: duration, loaded: true })
    }
  },

  setSubject: async (id) => {
    const state = get().state
    const next: TimerState = { ...state, subjectId: id, updatedAt: new Date().toISOString() }
    set({ state: next, subjectId: id })
    await api.timer.save(next)
  },

  setTask: async (id) => {
    const state = get().state
    const next: TimerState = { ...state, taskId: id, updatedAt: new Date().toISOString() }
    set({ state: next, taskId: id })
    await api.timer.save(next)
  },

  start: async (mode) => {
    const settings = useAppStore.getState().settings
    const current = get().state
    const targetMode = mode ?? current.mode
    const duration =
      mode && mode !== current.mode ? durationForMode(mode, settings.timer) : current.durationSeconds || durationForMode(targetMode, settings.timer)
    const now = Date.now()
    const next: TimerState = {
      ...current,
      mode: targetMode,
      status: 'running',
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + duration * 1000).toISOString(),
      durationSeconds: duration,
      remainingSeconds: duration,
      updatedAt: new Date(now).toISOString(),
    }
    set({ state: next, remaining: duration })
    await api.timer.save(next)
  },

  pause: async () => {
    const state = get().state
    if (state.status !== 'running') return
    const remaining = remainingSeconds(state)
    const next: TimerState = { ...state, status: 'paused', remainingSeconds: remaining, endsAt: null, updatedAt: new Date().toISOString() }
    set({ state: next, remaining })
    await api.timer.save(next)
  },

  resume: async () => {
    const state = get().state
    if (state.status !== 'paused') return
    const now = Date.now()
    const next: TimerState = {
      ...state,
      status: 'running',
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + state.remainingSeconds * 1000).toISOString(),
      updatedAt: new Date(now).toISOString(),
    }
    set({ state: next, remaining: state.remainingSeconds })
    await api.timer.save(next)
  },

  reset: async () => {
    const settings = useAppStore.getState().settings
    const state = get().state
    const duration = durationForMode(state.mode, settings.timer)
    const next: TimerState = {
      ...state,
      status: 'idle',
      startedAt: null,
      endsAt: null,
      durationSeconds: duration,
      remainingSeconds: duration,
      updatedAt: new Date().toISOString(),
    }
    set({ state: next, remaining: duration })
    await api.timer.save(next)
  },

  skip: async () => {
    await get().complete({ natural: false })
  },

  tick: () => {
    const { state, finishing } = get()
    if (state.status !== 'running') return
    const remaining = remainingSeconds(state)
    set({ remaining })
    if (remaining <= 0 && !finishing) void get().complete({ natural: true })
  },

  complete: async (opts) => {
    const { state, finishing } = get()
    if (finishing) return
    set({ finishing: true })
    const settings = useAppStore.getState().settings
    const now = new Date()
    const wasFocus = state.mode === 'focus'
    const elapsed = opts?.natural === false ? state.durationSeconds - get().remaining : state.durationSeconds

    try {
      if (elapsed > 0) {
        let topic = ''
        if (state.taskId) {
          try {
            const tasks = await api.tasks.list()
            topic = tasks.find((t) => t.id === state.taskId)?.title ?? ''
          } catch {
            topic = ''
          }
        }
        const startedAt = new Date(now.getTime() - elapsed * 1000)
        await api.sessions.create({
          subjectId: state.subjectId,
          chapterId: null,
          topic,
          type: state.mode,
          startTime: startedAt.toISOString(),
          endTime: now.toISOString(),
          durationSeconds: Math.round(elapsed),
          notes: '',
          completed: true,
        })
      }

      const completedFocusCount = state.completedFocusCount + (wasFocus ? 1 : 0)
      const upcoming = nextMode({
        current: state.mode,
        completedFocusCount,
        longBreakInterval: settings.timer.longBreakInterval,
      })
      const nextDuration = durationForMode(upcoming, settings.timer)
      const shouldAutoStart = upcoming === 'focus' ? settings.timer.autoStartFocus : settings.timer.autoStartBreaks
      const stamp = now.toISOString()
      const next: TimerState = {
        ...state,
        mode: upcoming,
        status: shouldAutoStart ? 'running' : 'idle',
        startedAt: shouldAutoStart ? stamp : null,
        endsAt: shouldAutoStart ? new Date(now.getTime() + nextDuration * 1000).toISOString() : null,
        durationSeconds: nextDuration,
        remainingSeconds: nextDuration,
        completedFocusCount,
        updatedAt: stamp,
      }
      set({ state: next, remaining: nextDuration, finishing: false })
      await api.timer.save(next)

      if (settings.timer.sound) playChime(settings.timer.volume, wasFocus ? 'focus' : 'break')
      if (settings.timer.notifications) {
        const title = wasFocus ? 'Focus session complete' : 'Break finished'
        const body = wasFocus
          ? `Nice work — ${Math.max(1, Math.round(elapsed / 60))} minutes recorded. Time for a ${upcoming === 'long_break' ? 'long' : 'short'} break.`
          : 'Ready for another focus session?'
        void api.app.notify(title, body)
      }
      toast.success(
        wasFocus ? 'Focus session saved' : 'Break finished',
        wasFocus ? `${Math.round(elapsed / 60)} minutes added to your study history.` : 'Your next focus block is ready.',
      )
      useAppStore.getState().bumpRefresh()
      await celebrateAchievements()
    } finally {
      set({ finishing: false })
    }
  },
}))

export function useTimer(): TimerStore {
  return useTimerStore()
}
