import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, Command, Plus, Search, Settings2, Timer } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge, Separator } from '@/components/ui/primitives'
import { SessionForm } from '@/components/forms/SessionForm'
import { TaskForm } from '@/components/forms/TaskForm'
import { SearchDialog } from '@/components/SearchDialog'
import { cn, friendlyDate, initials, relativeDay } from '@/lib/utils'
import { todayKey } from '@shared/stats'

export function TopBar() {
  const navigate = useNavigate()
  const settings = useSettings()
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const { data: subjects } = useAsync(() => api.subjects.list(), [])
  const { data: tasks } = useAsync(() => api.tasks.list(), [])
  const { data: goals } = useAsync(() => api.stats.goals(), [])

  const today = todayKey()
  const alerts = useMemo(() => {
    const list: { title: string; detail: string; tone: 'danger' | 'primary' | 'muted' }[] = []
    for (const task of tasks ?? []) {
      if (task.status === 'done' || !task.dueDate) continue
      if (task.dueDate < today) list.push({ title: task.title, detail: `Overdue · ${relativeDay(task.dueDate, today)}`, tone: 'danger' })
      else if (task.dueDate === today) list.push({ title: task.title, detail: 'Due today', tone: 'primary' })
    }
    for (const goal of goals ?? []) {
      if (goal.percent >= 100) list.push({ title: 'Goal reached', detail: `${goal.periodLabel} · ${goal.target} target`, tone: 'primary' })
    }
    return list
  }, [tasks, goals, today])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur-xl">
      <div className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground sm:flex">
        <CalendarDays className="h-4 w-4" />
        <span>{friendlyDate(new Date())}</span>
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="ml-auto hidden h-10 w-full min-w-0 max-w-xs items-center gap-2 rounded-2xl border border-border bg-surface px-3 text-sm text-muted-foreground transition-colors hover:border-ring sm:flex"
      >
        <Search className="h-4 w-4" />
        <span className="truncate">Search everything…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-lg border border-border px-1.5 py-0.5 text-[10px] font-bold sm:flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <div className="relative ml-auto flex shrink-0 items-center gap-1.5">
        <Button variant="soft" size="icon" aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}>
          <Bell className="h-4 w-4" />
          {alerts.length > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" aria-hidden />
          ) : null}
        </Button>
        <Button variant="soft" size="icon" aria-label="Start timer" onClick={() => navigate('/timer')}>
          <Timer className="h-4 w-4" />
        </Button>
        <Button onClick={() => setQuickOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick add</span>
        </Button>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] font-display text-sm font-bold text-primary transition-transform hover:scale-105"
          aria-label="Open profile settings"
        >
          {initials(settings.userName, 'SF')}
        </button>

        {notificationsOpen ? (
          <div className="absolute right-0 top-12 z-40 w-80 rounded-3xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold">Notifications</p>
              <Badge tone={alerts.length ? 'primary' : 'muted'}>{alerts.length} new</Badge>
            </div>
            <Separator className="my-3" />
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing needs attention. Enjoy the calm.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 6).map((alert, index) => (
                  <li key={`${alert.title}-${index}`} className="rounded-2xl bg-muted/50 p-2.5">
                    <p className={cn('text-sm font-bold', alert.tone === 'danger' && 'text-destructive')}>{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                setNotificationsOpen(false)
                navigate('/tasks')
              }}
            >
              Open planner
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick add</DialogTitle>
            <DialogDescription>Capture it now, stay in flow.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {[
              { label: 'Study session', detail: 'Log time you already studied', icon: Timer, action: () => setSessionOpen(true) },
              { label: 'Task', detail: 'Add something to your planner', icon: Plus, action: () => setTaskOpen(true) },
              { label: 'Settings', detail: 'Open preferences', icon: Settings2, action: () => navigate('/settings') },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  setQuickOpen(false)
                  option.action()
                }}
                className="flex items-center gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:border-ring hover:bg-muted/50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-primary">
                  <option.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SessionForm open={sessionOpen} onOpenChange={setSessionOpen} subjects={subjects ?? []} />
      <TaskForm open={taskOpen} onOpenChange={setTaskOpen} subjects={subjects ?? []} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
