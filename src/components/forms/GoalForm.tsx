import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/input'
import type { Goal, Subject } from '@shared/types'

const schema = z.object({
  type: z.enum(['daily_minutes', 'weekly_minutes', 'monthly_minutes', 'subject_minutes', 'session_count', 'chapter_count']),
  targetValue: z.number().min(1, 'Set a target').max(1_000_000),
  subjectId: z.string(),
})

type FormValues = z.infer<typeof schema>

export const GOAL_LABELS: Record<Goal['type'], string> = {
  daily_minutes: 'Daily study minutes',
  weekly_minutes: 'Weekly study minutes',
  monthly_minutes: 'Monthly study minutes',
  subject_minutes: 'Subject total minutes',
  session_count: 'Number of sessions',
  chapter_count: 'Chapters completed',
}

export function GoalForm({
  open,
  onOpenChange,
  goal,
  subjects,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
  subjects: Subject[]
}) {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'daily_minutes', targetValue: 120, subjectId: '' },
  })
  const type = form.watch('type')

  useEffect(() => {
    if (!open) return
    form.reset(
      goal
        ? { type: goal.type, targetValue: goal.targetValue, subjectId: goal.subjectId ?? '' }
        : { type: 'daily_minutes', targetValue: 120, subjectId: '' },
    )
  }, [open, goal, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      if (values.type === 'subject_minutes' && !values.subjectId) {
        toast.error('Choose a subject', 'Subject goals need a subject attached.')
        return
      }
      const payload = {
        type: values.type,
        targetValue: values.targetValue,
        subjectId: values.type === 'subject_minutes' ? values.subjectId : null,
      }
      if (goal) await api.goals.update(goal.id, payload)
      else await api.goals.create(payload)
      toast.success(goal ? 'Goal updated' : 'Goal created', GOAL_LABELS[values.type])
      bumpRefresh()
      onOpenChange(false)
    } catch (error) {
      toast.error('Could not save goal', error instanceof Error ? error.message : undefined)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit goal' : 'Set a study goal'}</DialogTitle>
          <DialogDescription>Break time never counts toward a goal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="goal-type">Goal type</Label>
            <Select id="goal-type" {...form.register('type')}>
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          {type === 'subject_minutes' ? (
            <div className="grid gap-2">
              <Label htmlFor="goal-subject">Subject</Label>
              <Select id="goal-subject" {...form.register('subjectId')}>
                <option value="">Choose a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="goal-target">Target</Label>
            <Input id="goal-target" type="number" min={1} step={1} {...form.register('targetValue', { valueAsNumber: true })} />
            {form.formState.errors.targetValue ? (
              <p className="text-xs text-destructive">{form.formState.errors.targetValue.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{goal ? 'Save changes' : 'Create goal'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
