import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { useAppStore } from '@/stores/appStore'
import { useTimerStore } from '@/stores/timerStore'
import { getBridge } from '@/lib/api'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { TimerPage } from '@/features/timer/TimerPage'
import { SessionsPage } from '@/features/sessions/SessionsPage'
import { SubjectsPage } from '@/features/subjects/SubjectsPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { NotesPage } from '@/features/notes/NotesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

function MenuBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = getBridge().onMenuAction((action) => {
        if (action === 'new-session') navigate('/sessions')
        if (action === 'start-timer') navigate('/timer')
        if (action === 'open-settings') navigate('/settings')
        if (action === 'open-dashboard') navigate('/')
      })
    } catch {
      // Menu actions only exist in the desktop shell.
    }
    return () => unsubscribe()
  }, [navigate])
  return null
}

export default function App() {
  const ready = useAppStore((state) => state.ready)
  const loadError = useAppStore((state) => state.loadError)
  const load = useAppStore((state) => state.load)
  const loadTimer = useTimerStore((state) => state.load)
  const tick = useTimerStore((state) => state.tick)
  const theme = useAppStore((state) => state.settings.theme)

  useEffect(() => {
    void (async () => {
      await load()
      await loadTimer()
    })()
  }, [load, loadTimer])

  useEffect(() => {
    const interval = window.setInterval(() => tick(), 500)
    return () => window.clearInterval(interval)
  }, [tick])

  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [tick])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => {
      if (useAppStore.getState().settings.theme !== 'system') return
      document.documentElement.classList.toggle('dark', media.matches)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  if (!ready) {
    return (
      <div className="grid h-full place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-semibold">Opening your study desk…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="grid h-full place-items-center bg-background p-8">
        <div className="max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-card">
          <h1 className="font-display text-xl font-bold">StudyFlow could not start</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Launch the desktop build with <code className="rounded bg-muted px-1.5 py-0.5">npm start</code> so the local database can open.
          </p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <MenuBridge />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
