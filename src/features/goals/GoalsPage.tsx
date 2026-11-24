import { useMemo, useState } from 'react'
import { Pencil, Plus, Sparkles, Target, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, EmptyState, Progress, Separator } from '@/components/ui/primitives'
import { GoalForm, GOAL_LABELS } from '@/components/forms/GoalForm'
import { minutesToLabel } from '@/lib/utils'
import { shortDate } from '@/lib/utils'
import type { Goal, GoalProgress } from '@shared/types'

export function GoalsPage() {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)

  const { data: goals } = useAsync(() => api.stats.goals(), [])
  const { data: subjects } = useAsync(() => api.subjects.list(), [])

  const { active, achieved } = useMemo(() => {
    const list = goals ?? []
    return { active: list.filter((goal) => goal.percent < 100), achieved: list.filter((goal) => goal.percent >= 100) }
  }, [goals])

  const remove = async (goal: Goal): Promise<void> => {
    try {
      await api.goals.remove(goal.id)
      toast.success('Goal removed', GOAL_LABELS[goal.type])
      bumpRefresh()
    } catch (error) {
      toast.error('Could not remove goal', error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Study Goals"
        subtitle="Targets measured from real focus time — breaks never count."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New goal
          </Button>
        }
      />

      {(goals ?? []).length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="No goals set"
          description="A daily minute target is the easiest place to start."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Create your first goal
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((item) => (
              <GoalCard key={item.goal.id} item={item} onEdit={() => { setEditing(item.goal); setFormOpen(true) }} onRemove={() => void remove(item.goal)} />
            ))}
          </div>

          {achieved.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-bold">Achieved</h2>
                <Separator className="flex-1" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {achieved.map((item) => (
                  <GoalCard key={item.goal.id} item={item} onEdit={() => { setEditing(item.goal); setFormOpen(true) }} onRemove={() => void remove(item.goal)} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <GoalForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        goal={editing}
        subjects={subjects ?? []}
      />
    </div>
  )
}

function GoalCard({ item, onEdit, onRemove }: { item: GoalProgress; onEdit: () => void; onRemove: () => void }) {
  const unit = item.goal.type.endsWith('minutes') ? 'min' : item.goal.type === 'chapter_count' ? 'chapters' : 'sessions'
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>{item.subjectName ?? GOAL_LABELS[item.goal.type]}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {item.periodLabel} · created {shortDate(item.goal.createdAt)}
          </p>
        </div>
        <Badge tone={item.percent >= 100 ? 'success' : 'primary'}>{item.percent}%</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span>
              {item.goal.type.endsWith('minutes') ? minutesToLabel(item.current) : `${item.current} ${unit}`} of{' '}
              {item.goal.type.endsWith('minutes') ? minutesToLabel(item.target) : `${item.target} ${unit}`}
            </span>
            <span className="text-muted-foreground">{item.percent >= 100 ? 'Complete' : `${Math.max(0, item.target - item.current)} to go`}</span>
          </div>
          <Progress value={item.percent} indicatorClassName={item.percent >= 100 ? 'bg-emerald-500' : undefined} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
