import { useMemo, useState } from 'react'
import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Badge, EmptyState, Separator, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives'
import { TaskForm } from '@/components/forms/TaskForm'
import { ScheduleForm } from '@/components/forms/ScheduleForm'
import { addDays, startOfWeekKey, todayKey } from '@shared/stats'
import { cn, relativeDay, shortDate } from '@/lib/utils'
import type { StudySchedule, Task } from '@shared/types'

export function TasksPage() {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const [tab, setTab] = useState('tasks')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [status, setStatus] = useState('open')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<StudySchedule | null>(null)
  const [scheduleDate, setScheduleDate] = useState(todayKey())

  const { data: tasks } = useAsync(() => api.tasks.list(), [])
  const { data: subjects } = useAsync(() => api.subjects.list(), [])
  const weekStart = addDays(startOfWeekKey(todayKey()), weekOffset * 7)
  const weekEnd = addDays(weekStart, 6)
  const { data: schedules } = useAsync(() => api.schedules.list(weekStart, weekEnd), [weekStart, weekEnd])

  const subjectById = useMemo(() => new Map((subjects ?? []).map((subject) => [subject.id, subject])), [subjects])

  const filtered = useMemo(
    () =>
      (tasks ?? []).filter((task) => {
        if (search.trim() && !`${task.title} ${task.description}`.toLowerCase().includes(search.trim().toLowerCase())) return false
        if (priority && task.priority !== priority) return false
        if (subjectFilter && task.subjectId !== subjectFilter) return false
        if (status === 'open' && task.status === 'done') return false
        if (status === 'done' && task.status !== 'done') return false
        return true
      }),
    [tasks, search, priority, subjectFilter, status],
  )

  const toggle = async (task: Task): Promise<void> => {
    try {
      await api.tasks.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
      bumpRefresh()
    } catch (error) {
      toast.error('Could not update task', error instanceof Error ? error.message : undefined)
    }
  }

  const remove = async (task: Task): Promise<void> => {
    try {
      await api.tasks.remove(task.id)
      toast.success('Task deleted', task.title)
      bumpRefresh()
    } catch (error) {
      toast.error('Could not delete task', error instanceof Error ? error.message : undefined)
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const today = todayKey()

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Tasks & Planner"
        subtitle="What needs doing, and when you will actually do it."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="planner">
            <CalendarDays className="h-3.5 w-3.5" /> Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <div className="relative min-w-[13rem] flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks…" className="pl-9" />
              </div>
              <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[9rem]">
                <option value="open">Open</option>
                <option value="done">Completed</option>
                <option value="all">All</option>
              </Select>
              <Select value={priority} onChange={(event) => setPriority(event.target.value)} className="max-w-[9rem]">
                <option value="">Any priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
              <Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="max-w-[11rem]">
                <option value="">All subjects</option>
                {(subjects ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-5 w-5" />}
              title="Nothing here"
              description="Create a task, or change the filters above."
              action={
                <Button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  New task
                </Button>
              }
            />
          ) : (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {filtered.map((task) => {
                  const subject = task.subjectId ? subjectById.get(task.subjectId) : undefined
                  const overdue = task.dueDate && task.dueDate < today && task.status !== 'done'
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-3.5">
                      <button
                        type="button"
                        onClick={() => void toggle(task)}
                        aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`}
                        className={cn(
                          'grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors',
                          task.status === 'done' ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-ring',
                        )}
                      >
                        {task.status === 'done' ? '✓' : ''}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-sm font-bold', task.status === 'done' && 'text-muted-foreground line-through')}>
                          {task.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {subject ? `${subject.name} · ` : ''}
                          {task.dueDate ? (overdue ? 'Overdue · ' : `${relativeDay(task.dueDate, today)} · `) : 'No due date · '}
                          {task.estimatedMinutes > 0 ? `${task.estimatedMinutes} min est.` : 'no estimate'}
                        </p>
                      </div>
                      <Badge tone={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'primary' : 'muted'}>
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${task.title}`}
                          onClick={() => {
                            setEditing(task)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${task.title}`} onClick={() => void remove(task)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="planner" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {shortDate(weekStart)} — {shortDate(weekEnd)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Weekly study blocks</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => setWeekOffset((offset) => offset - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                  This week
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => setWeekOffset((offset) => offset + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-7">
                {weekDays.map((day) => {
                  const dayBlocks = (schedules ?? []).filter((block) => block.date === day)
                  const isToday = day === today
                  return (
                    <div
                      key={day}
                      className={cn(
                        'flex min-h-[10rem] flex-col gap-2 rounded-2xl border p-2.5',
                        isToday ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]' : 'border-border',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
                        </p>
                        <span className={cn('text-xs font-bold', isToday && 'text-primary')}>{day.slice(8)}</span>
                      </div>
                      {dayBlocks.map((block) => {
                        const subject = block.subjectId ? subjectById.get(block.subjectId) : undefined
                        return (
                          <button
                            key={block.id}
                            type="button"
                            onClick={() => {
                              setEditingSchedule(block)
                              setScheduleDate(day)
                              setScheduleOpen(true)
                            }}
                            className="rounded-xl p-2 text-left text-[11px] font-semibold transition-transform hover:scale-[1.02]"
                            style={{ backgroundColor: `${subject?.color ?? '#8B7CF6'}22`, color: subject?.color ?? 'var(--primary)' }}
                          >
                            <span className="block">
                              {String(Math.floor(block.startMinute / 60)).padStart(2, '0')}:{String(block.startMinute % 60).padStart(2, '0')}
                            </span>
                            <span className="block truncate text-foreground">{subject?.name ?? (block.note || 'Study')}</span>
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSchedule(null)
                          setScheduleDate(day)
                          setScheduleOpen(true)
                        }}
                        className="mt-auto flex items-center justify-center gap-1 rounded-xl border border-dashed border-border py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-ring hover:text-primary"
                      >
                        <Plus className="h-3 w-3" /> Block
                      </button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(tasks ?? [])
                .filter((task) => task.status !== 'done' && task.dueDate)
                .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
                .slice(0, 6)
                .map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
                    <div>
                      <p className="text-sm font-bold">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.dueDate ? relativeDay(task.dueDate, today) : ''}</p>
                    </div>
                    <Badge tone={task.priority === 'high' ? 'danger' : 'outline'}>{task.priority}</Badge>
                  </div>
                ))}
              {(tasks ?? []).filter((task) => task.status !== 'done' && task.dueDate).length === 0 ? (
                <p className="text-sm text-muted-foreground">No deadlines set. Add a due date to a task to see it here.</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="opacity-0" />
      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        task={editing}
        subjects={subjects ?? []}
      />
      <ScheduleForm
        open={scheduleOpen}
        onOpenChange={(open) => {
          setScheduleOpen(open)
          if (!open) setEditingSchedule(null)
        }}
        schedule={editingSchedule}
        subjects={subjects ?? []}
        tasks={tasks ?? []}
        defaultDate={scheduleDate}
      />
    </div>
  )
}
