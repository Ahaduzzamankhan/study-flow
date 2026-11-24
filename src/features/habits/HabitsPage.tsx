import { useMemo, useState } from 'react'
import { Check, Flame, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, EmptyState, Progress } from '@/components/ui/primitives'
import { HabitForm } from '@/components/forms/HabitForm'
import { IconFor } from '@/lib/icons'
import { addDays, todayKey } from '@shared/stats'
import { cn } from '@/lib/utils'
import type { Habit } from '@shared/types'

export function HabitsPage() {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [showMonth, setShowMonth] = useState(false)

  const { data: habits } = useAsync(() => api.stats.habits(), [])
  const today = todayKey()
  const days = useMemo(() => Array.from({ length: showMonth ? 30 : 7 }, (_, index) => addDays(today, -(showMonth ? 29 : 6) + index)), [today, showMonth])

  const toggle = async (habitId: string, date: string): Promise<void> => {
    try {
      await api.habits.toggle(habitId, date)
      bumpRefresh()
    } catch (error) {
      toast.error('Could not update habit', error instanceof Error ? error.message : undefined)
    }
  }

  const archive = async (habit: Habit): Promise<void> => {
    try {
      await api.habits.remove(habit.id)
      toast.success('Habit archived', habit.name)
      bumpRefresh()
    } catch (error) {
      toast.error('Could not archive habit', error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Habit Tracker"
        subtitle="Tiny daily routines, tracked honestly."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowMonth((value) => !value)}>
              {showMonth ? 'Show week' : 'Show month'}
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> New habit
            </Button>
          </>
        }
      />

      {(habits ?? []).length === 0 ? (
        <EmptyState
          icon={<Flame className="h-5 w-5" />}
          title="No habits yet"
          description="Start with one: revise yesterday's chapter, or read ten pages."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Add a habit
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(habits ?? []).map((habit) => (
            <Card key={habit.id}>
              <CardHeader className="flex-row items-start gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                  style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
                >
                  <IconFor name={habit.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{habit.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{habit.description || 'Daily habit'}</p>
                </div>
                <Badge tone="primary">
                  <Flame className="h-3 w-3" /> {habit.streak}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${habit.name}`}
                    onClick={() => {
                      setEditing(habit)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Archive ${habit.name}`} onClick={() => void archive(habit)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={cn('grid gap-1.5', showMonth ? 'grid-cols-10' : 'grid-cols-7')}>
                  {days.map((day) => {
                    const done = habit.completions.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => void toggle(habit.id, day)}
                        aria-label={`${done ? 'Unmark' : 'Mark'} ${habit.name} on ${day}`}
                        className={cn(
                          'flex aspect-square items-center justify-center rounded-xl border text-[10px] font-bold transition-colors',
                          done ? 'border-transparent text-white' : 'border-border text-muted-foreground hover:border-ring',
                        )}
                        style={done ? { backgroundColor: habit.color } : undefined}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : showMonth ? day.slice(8) : ['M', 'T', 'W', 'T', 'F', 'S', 'S'][days.indexOf(day)]}
                      </button>
                    )
                  })}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
                    <span>Last 30 days</span>
                    <span className="text-muted-foreground">{habit.completionRate}%</span>
                  </div>
                  <Progress value={habit.completionRate} indicatorClassName="bg-[var(--ring)]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HabitForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        habit={editing}
      />
    </div>
  )
}
