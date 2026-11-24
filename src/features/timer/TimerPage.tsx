import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Coffee, Maximize2, Minimize2, Pause, Play, RotateCcw, Settings2, SkipForward, Sparkles, Timer as TimerIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore, useSettings } from '@/stores/appStore'
import { useTimerStore } from '@/stores/timerStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, Label } from '@/components/ui/input'
import { Badge, Progress, Separator } from '@/components/ui/primitives'
import { MODE_LABELS, formatClock, progressPercent } from '@/lib/timer'
import { formatDuration, todayKey } from '@shared/stats'
import { cn } from '@/lib/utils'

const PRESETS = {
  classic: { label: 'Classic Pomodoro', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 },
  deep: { label: 'Deep work', focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 25, longBreakInterval: 3 },
  sprint: { label: 'Quick sprint', focusMinutes: 15, shortBreakMinutes: 3, longBreakMinutes: 10, longBreakInterval: 4 },
} as const

export function TimerPage() {
  const navigate = useNavigate()
  const settings = useSettings()
  const patchSettings = useAppStore((store) => store.patchSettings)
  const { state, remaining, subjectId, taskId, setSubject, setTask, start, pause, resume, reset, skip } = useTimerStore()
  const [focusMode, setFocusMode] = useState(false)

  const { data: subjects } = useAsync(() => api.subjects.list(), [])
  const { data: tasks } = useAsync(() => api.tasks.list(), [])
  const { data: sessions } = useAsync(() => api.sessions.list({ from: `${todayKey()}T00:00:00.000Z`, limit: 50 }), [])
  const { data: overview } = useAsync(() => api.stats.overview(), [])

  const running = state.status === 'running'
  const paused = state.status === 'paused'
  const percent = progressPercent(state.durationSeconds || remaining || 1, remaining)
  const todayFocus = useMemo(
    () => (sessions ?? []).filter((s) => s.type === 'focus').reduce((sum, s) => sum + s.durationSeconds, 0),
    [sessions],
  )

  useEffect(() => {
    if (!focusMode) return
    void api.app.setFullScreen(true)
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode])

  useEffect(() => {
    if (!focusMode) void api.app.setFullScreen(false)
  }, [focusMode])

  const applyPreset = (key: keyof typeof PRESETS): void => {
    void patchSettings({ timer: { ...settings.timer, ...PRESETS[key], preset: key } })
  }

  const radius = 132
  const circumference = 2 * Math.PI * radius

  const timerBody = (
    <div className="relative grid place-items-center">
      <svg width="320" height="320" viewBox="0 0 320 320" className="-rotate-90">
        <circle cx="160" cy="160" r={radius} fill="none" stroke="var(--muted)" strokeWidth="16" />
        <motion.circle
          cx="160"
          cy="160"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference - (percent / 100) * circumference }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <Badge tone={state.mode === 'focus' ? 'primary' : 'success'}>{MODE_LABELS[state.mode]}</Badge>
        <p className="mt-2 font-display text-6xl font-extrabold tabular-nums">{formatClock(remaining || state.durationSeconds)}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {running ? 'In progress' : paused ? 'Paused' : 'Ready'}
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          {Array.from({ length: settings.timer.longBreakInterval }).map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-2 w-2 rounded-full',
                index < state.completedFocusCount % settings.timer.longBreakInterval ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )

  const controls = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {running ? (
        <Button size="lg" onClick={() => void pause()} className="gap-2">
          <Pause className="h-4 w-4" /> Pause
        </Button>
      ) : paused ? (
        <Button size="lg" onClick={() => void resume()} className="gap-2">
          <Play className="h-4 w-4" /> Resume
        </Button>
      ) : (
        <Button size="lg" onClick={() => void start()} className="gap-2">
          <Play className="h-4 w-4" /> Start {state.mode === 'focus' ? 'focus' : 'break'}
        </Button>
      )}
      <Button variant="outline" size="lg" onClick={() => void reset()} className="gap-2">
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
      <Button variant="ghost" size="lg" onClick={() => void skip()} className="gap-2">
        <SkipForward className="h-4 w-4" /> {state.mode === 'focus' ? 'Skip to break' : 'Skip break'}
      </Button>
      <Button variant="soft" size="lg" onClick={() => setFocusMode((value) => !value)} className="gap-2">
        {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {focusMode ? 'Exit focus' : 'Focus mode'}
      </Button>
    </div>
  )

  if (focusMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[var(--background)] p-8">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--secondary)_30%,transparent)] blur-3xl" />
        </div>
        <div className="relative text-center">
          <p className="font-display text-2xl font-bold">
            {subjectId ? subjects?.find((subject) => subject.id === subjectId)?.name ?? 'Focus' : 'Focused study'}
          </p>
          {taskId ? <p className="text-sm text-muted-foreground">{tasks?.find((task) => task.id === taskId)?.title}</p> : null}
        </div>
        <div className="relative">{timerBody}</div>
        <div className="relative">{controls}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Study Timer"
        subtitle="Timestamp-accurate Pomodoro sessions that survive minimising, sleep and restarts."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              <Settings2 className="h-4 w-4" /> Timer settings
            </Button>
            <Button variant="soft" onClick={() => applyPreset('classic')}>
              Reset to classic
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="relative overflow-hidden">
          <CardContent className="flex flex-col items-center gap-6 p-4 pb-8 pt-8">
            {timerBody}
            {controls}
            <div className="grid w-full gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="timer-subject">Subject</Label>
                <Select id="timer-subject" value={subjectId ?? ''} onChange={(event) => void setSubject(event.target.value || null)}>
                  <option value="">No subject</option>
                  {(subjects ?? []).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timer-task">Task</Label>
                <Select id="timer-task" value={taskId ?? ''} onChange={(event) => void setTask(event.target.value || null)}>
                  <option value="">No task</option>
                  {(tasks ?? [])
                    .filter((task) => task.status !== 'done')
                    .map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Session progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                  <span>Current block</span>
                  <span className="text-muted-foreground">
                    {formatDuration(Math.max(0, state.durationSeconds - remaining))} / {formatDuration(state.durationSeconds)}
                  </span>
                </div>
                <Progress value={percent} />
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="font-display text-xl font-extrabold">{state.completedFocusCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Focus done</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="font-display text-xl font-extrabold">{formatDuration(todayFocus)}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Today</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="font-display text-xl font-extrabold">{overview?.streak ?? 0}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Day streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TimerIcon className="h-4 w-4 text-primary" /> Presets
              </CardTitle>
              <Badge tone="outline">{settings.timer.preset}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => {
                const preset = PRESETS[key]
                const active = settings.timer.preset === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors',
                      active ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <span>
                      <span className="block text-sm font-bold">{preset.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {preset.focusMinutes} focus · {preset.shortBreakMinutes} short · {preset.longBreakMinutes} long
                      </span>
                    </span>
                    {active ? <Sparkles className="h-4 w-4 text-primary" /> : null}
                  </button>
                )
              })}
              <p className="pt-1 text-xs text-muted-foreground">
                Custom durations, auto-start and sounds live in <button className="font-bold text-primary underline" onClick={() => navigate('/settings')}>Settings → Timer</button>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-primary" /> Today&apos;s sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(sessions ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet today. Your first block starts here.</p>
              ) : (
                (sessions ?? []).slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2">
                    <span className="truncate text-sm font-bold">{session.topic || MODE_LABELS[session.type as keyof typeof MODE_LABELS] || 'Session'}</span>
                    <span className="text-xs font-bold text-muted-foreground">{formatDuration(session.durationSeconds)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
