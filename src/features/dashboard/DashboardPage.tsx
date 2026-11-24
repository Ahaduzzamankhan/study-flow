import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  Clock,
  Flame,
  Gauge,
  ListChecks,
  Play,
  Quote,
  Settings2,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore, useSettings } from '@/stores/appStore'
import { useTimerStore } from '@/stores/timerStore'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Heatmap } from '@/components/Heatmap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, EmptyState, Progress, Separator } from '@/components/ui/primitives'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { WIDGET_LABELS, MOTIVATION_QUOTES } from '@shared/defaults'
import { addDays, formatDuration, todayKey } from '@shared/stats'
import { cn, shortDate, relativeDay, timeOfDay } from '@/lib/utils'

const CHART_COLORS = ['#8B7CF6', '#6CB8F6', '#F48FB6', '#6FD3B6', '#F8A96E', '#5B6BC0']

export function DashboardPage() {
  const navigate = useNavigate()
  const settings = useSettings()
  const timer = useTimerStore((state) => state.state)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const today = todayKey()
  const yearAgo = addDays(today, -364)

  const { data: overview } = useAsync(() => api.stats.overview(), [])
  const { data: heatmap } = useAsync(() => api.stats.heatmap(yearAgo, today), [yearAgo, today])
  const { data: daily } = useAsync(() => api.stats.daily(addDays(today, -13), today), [today])
  const { data: subjects } = useAsync(() => api.stats.subjects(), [])
  const { data: tasks } = useAsync(() => api.tasks.list(), [])
  const { data: sessions } = useAsync(() => api.sessions.list({ limit: 6 }), [])
  const { data: goals } = useAsync(() => api.stats.goals(), [])
  const { data: achievements } = useAsync(() => api.stats.achievements(), [])
  const { data: schedules } = useAsync(() => api.schedules.list(today, today), [today])
  const { data: subjectList } = useAsync(() => api.subjects.list(), [])

  const upcomingTasks = useMemo(
    () =>
      (tasks ?? [])
        .filter((task) => task.status !== 'done')
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
        .slice(0, 5),
    [tasks],
  )

  const weekData = (daily ?? []).map((day) => ({
    label: new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
    minutes: Math.round(day.seconds / 60),
    date: day.date,
  }))

  const subjectData = (subjects ?? []).filter((subject) => subject.seconds > 0).slice(0, 6)
  const unlocked = (achievements ?? []).filter((item) => item.unlockedAt)
  const activeGoals = (goals ?? []).slice(0, 3)
  const subjectById = new Map((subjectList ?? []).map((subject) => [subject.id, subject]))
  const quote = MOTIVATION_QUOTES[new Date().getDate() % MOTIVATION_QUOTES.length]

  const lastStudied = (sessions ?? []).find((session) => session.subjectId)
  const continueSubject = lastStudied?.subjectId ? subjectById.get(lastStudied.subjectId) : undefined

  const widgets = settings.dashboardWidgets.length ? settings.dashboardWidgets : Object.keys(WIDGET_LABELS)

  const widgetContent: Record<string, ReactNode> = {
    continue: (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary">
            <Play className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">
              {continueSubject ? `Continue ${continueSubject.name}` : 'Start your first focus session'}
            </p>
            <p className="text-sm text-muted-foreground">
              {continueSubject
                ? `Last studied ${lastStudied ? shortDate(lastStudied.startTime) : 'recently'} · ${settings.timer.focusMinutes} minute block ready`
                : 'Set a subject and let the timer track every minute.'}
            </p>
          </div>
          <Button onClick={() => navigate('/timer')} className="gap-2">
            <Timer className="h-4 w-4" />
            {timer.status === 'running' ? 'Resume timer' : 'Open timer'}
          </Button>
        </CardContent>
      </Card>
    ),
    heatmap: (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Study activity</CardTitle>
          <Badge tone="primary">{overview ? `${overview.streak} day streak` : 'No streak yet'}</Badge>
        </CardHeader>
        <CardContent>
          <Heatmap data={heatmap ?? {}} />
        </CardContent>
      </Card>
    ),
    weekly: (
      <Card>
        <CardHeader>
          <CardTitle>Last 14 days</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {weekData.some((day) => day.minutes > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <ChartTooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
                  formatter={(value: number) => [`${value} min`, 'Studied']}
                />
                <Bar dataKey="minutes" radius={[8, 8, 8, 8]} fill="var(--primary)" maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<Gauge className="h-5 w-5" />} title="No study time yet" description="Your first focus session fills this chart." />
          )}
        </CardContent>
      </Card>
    ),
    subjects: (
      <Card>
        <CardHeader>
          <CardTitle>Subject distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {subjectData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subjectData} dataKey="seconds" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                  {subjectData.map((entry, index) => (
                    <Cell key={entry.subjectId} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  contentStyle={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
                  formatter={(value: number, name: string) => [formatDuration(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No subjects tracked" description="Add a subject to see how your time splits." />
          )}
        </CardContent>
      </Card>
    ),
    upcoming: (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Upcoming tasks</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
            All <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks. Add one when you plan the week.</p>
          ) : (
            upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-primary' : 'bg-muted-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.dueDate ? relativeDay(task.dueDate, today) : 'No due date'}
                    {task.subjectId && subjectById.get(task.subjectId) ? ` · ${subjectById.get(task.subjectId)?.name}` : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    ),
    schedule: (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(schedules ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled. Block out a study slot in the planner.</p>
          ) : (
            (schedules ?? []).map((block) => (
              <div key={block.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3">
                <div>
                  <p className="text-sm font-bold">
                    {block.subjectId ? subjectById.get(block.subjectId)?.name ?? 'Study block' : block.note || 'Study block'}
                  </p>
                  <p className="text-xs text-muted-foreground">{block.note || 'Focus time'}</p>
                </div>
                <Badge tone="outline">
                  {String(Math.floor(block.startMinute / 60)).padStart(2, '0')}:{String(block.startMinute % 60).padStart(2, '0')} —{' '}
                  {String(Math.floor(block.endMinute / 60)).padStart(2, '0')}:{String(block.endMinute % 60).padStart(2, '0')}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    ),
    recent: (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent sessions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
            History <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(sessions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
          ) : (
            (sessions ?? []).map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {session.topic || (session.subjectId ? subjectById.get(session.subjectId)?.name : '') || 'Study session'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shortDate(session.startTime)} · {timeOfDay(session.startTime)}
                  </p>
                </div>
                <Badge tone={session.type === 'focus' ? 'primary' : 'muted'}>{formatDuration(session.durationSeconds)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    ),
    goals: (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Active goals</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>
            Manage <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet. A daily target keeps momentum honest.</p>
          ) : (
            activeGoals.map((goal) => (
              <div key={goal.goal.id}>
                <div className="mb-1 flex items-center justify-between text-xs font-bold">
                  <span className="truncate">
                    {goal.subjectName ?? goal.periodLabel} · {goal.target}
                  </span>
                  <span className="text-muted-foreground">{goal.percent}%</span>
                </div>
                <Progress value={goal.percent} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    ),
    achievements: (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent achievements</CardTitle>
          <Badge tone="accent">{unlocked.length} unlocked</Badge>
        </CardHeader>
        <CardContent>
          {unlocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Study a little and your first badge unlocks here.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unlocked.slice(-4).map((item) => (
                <span key={item.key} className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-xs font-bold">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  {item.title}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    ),
    quote: (
      <Card className="bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))]">
        <CardContent className="flex items-start gap-3 p-5">
          <Quote className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-display text-base font-bold leading-snug">{quote}</p>
            <p className="mt-1 text-xs text-muted-foreground">Daily motivation</p>
          </div>
        </CardContent>
      </Card>
    ),
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={`${greeting()}, ${settings.userName || 'scholar'}`}
        subtitle="Here is how your study life looks today."
        actions={
          <>
            <Button variant="outline" onClick={() => setCustomizeOpen(true)}>
              <Settings2 className="h-4 w-4" /> Customize
            </Button>
            <Button onClick={() => navigate('/timer')}>
              <Play className="h-4 w-4" /> {timer.status === 'running' ? 'Timer running' : 'Start focus'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<Clock className="h-5 w-5" />} label="Today studied" value={formatDuration(overview?.todaySeconds ?? 0)} hint={`${overview?.todaySessions ?? 0} sessions today`} />
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Total sessions" value={String(overview?.totalSessions ?? 0)} hint={formatDuration(overview?.totalSeconds ?? 0) + ' all time'} accent="sky" delay={0.04} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Current streak" value={`${overview?.streak ?? 0} days`} hint={`Longest ${overview?.longestStreak ?? 0} days`} accent="rose" delay={0.08} />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Daily goal"
          value={overview?.todayGoalMinutes ? `${overview.goalCompletion}%` : 'Not set'}
          hint={overview?.todayGoalMinutes ? `${formatDuration(overview.todaySeconds)} of ${overview.todayGoalMinutes} min` : 'Add a daily goal in Study Goals'}
          accent="mint"
          delay={0.12}
        />
        <StatCard icon={<Gauge className="h-5 w-5" />} label="This week" value={formatDuration(overview?.weekSeconds ?? 0)} hint={`Level ${overview?.level.level ?? 1} · ${overview?.level.xp ?? 0} XP`} accent="peach" delay={0.16} />
        <StatCard icon={<CheckSquare className="h-5 w-5" />} label="Tasks completed" value={String(overview?.completedTasks ?? 0)} hint={`${overview?.openTasks ?? 0} still open`} delay={0.2} />
      </div>

      {widgets.map((key) => {
        const content = widgetContent[key]
        if (!content) return null
        return (
          <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {content}
          </motion.div>
        )
      })}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Study rhythm</CardTitle>
          <Link to="/analytics" className="text-xs font-bold text-primary hover:underline">
            Full analytics
          </Link>
        </CardHeader>
        <CardContent className="h-48">
          {(daily ?? []).some((day) => day.seconds > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rhythm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <ChartTooltip
                  contentStyle={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
                  formatter={(value: number) => [`${value} min`, 'Studied']}
                />
                <Area type="monotone" dataKey="minutes" stroke="var(--primary)" strokeWidth={2.5} fill="url(#rhythm)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Your rhythm chart is waiting" description="Log a session and this area fills in." />
          )}
        </CardContent>
      </Card>

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize dashboard</DialogTitle>
            <DialogDescription>Reorder widgets and hide the ones you do not need.</DialogDescription>
          </DialogHeader>
          <WidgetCustomizer />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function WidgetCustomizer() {
  const settings = useSettings()
  const patchSettings = useAppStore((state) => state.patchSettings)
  const current = settings.dashboardWidgets.length ? settings.dashboardWidgets : Object.keys(WIDGET_LABELS)
  const hidden = Object.keys(WIDGET_LABELS).filter((key) => !current.includes(key))

  const move = (index: number, direction: -1 | 1): void => {
    const next = [...current]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const a = next[index]
    const b = next[target]
    if (!a || !b) return
    next[index] = b
    next[target] = a
    void patchSettings({ dashboardWidgets: next })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {current.map((key, index) => (
          <div key={key} className="flex items-center justify-between gap-2 rounded-2xl border border-border p-2.5">
            <span className="text-sm font-bold">{WIDGET_LABELS[key] ?? key}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Move up" onClick={() => move(index, -1)}>
                ↑
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move down" onClick={() => move(index, 1)}>
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void patchSettings({ dashboardWidgets: current.filter((item) => item !== key) })}
              >
                Hide
              </Button>
            </div>
          </div>
        ))}
      </div>
      {hidden.length > 0 ? (
        <>
          <Separator />
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hidden</p>
          <div className="flex flex-wrap gap-2">
            {hidden.map((key) => (
              <Button key={key} variant="soft" size="sm" onClick={() => void patchSettings({ dashboardWidgets: [...current, key] })}>
                Show {WIDGET_LABELS[key] ?? key}
              </Button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
