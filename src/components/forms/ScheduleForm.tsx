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
import type { StudySchedule, Subject, Task } from '@shared/types'

const schema = z
  .object({
    subjectId: z.string(),
    taskId: z.string(),
    date: z.string().min(1, 'Pick a date'),
    start: z.string().min(1, 'Pick a start time'),
    end: z.string().min(1, 'Pick an end time'),
    note: z.string().max(300),
  })
  .refine((values) => values.end > values.start, { message: 'The end time must be after the start time', path: ['end'] })

type FormValues = z.infer<typeof schema>

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function timeOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function ScheduleForm({
  open,
  onOpenChange,
  schedule,
  subjects,
  tasks,
  defaultDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule?: StudySchedule | null
  subjects: Subject[]
  tasks: Task[]
  defaultDate: string
}) {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subjectId: '', taskId: '', date: defaultDate, start: '18:00', end: '19:00', note: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      schedule
        ? {
            subjectId: schedule.subjectId ?? '',
            taskId: schedule.taskId ?? '',
            date: schedule.date,
            start: timeOf(schedule.startMinute),
            end: timeOf(schedule.endMinute),
            note: schedule.note,
          }
        : { subjectId: '', taskId: '', date: defaultDate, start: '18:00', end: '19:00', note: '' },
    )
  }, [open, schedule, defaultDate, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        subjectId: values.subjectId || null,
        taskId: values.taskId || null,
        date: values.date,
        startMinute: minutesOf(values.start),
        endMinute: minutesOf(values.end),
        note: values.note,
      }
      if (schedule) await api.schedules.update(schedule.id, payload)
      else await api.schedules.create(payload)
      toast.success(schedule ? 'Study block updated' : 'Study block scheduled', `${values.start} — ${values.end}`)
      bumpRefresh()
      onOpenChange(false)
    } catch (error) {
      toast.error('Could not save study block', error instanceof Error ? error.message : undefined)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit study block' : 'Schedule a study block'}</DialogTitle>
          <DialogDescription>Reserve a slot in your planner and link it to a subject or task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="schedule-date">Date</Label>
            <Input id="schedule-date" type="date" {...form.register('date')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="schedule-start">Start</Label>
              <Input id="schedule-start" type="time" {...form.register('start')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-end">End</Label>
              <Input id="schedule-end" type="time" {...form.register('end')} />
            </div>
          </div>
          {form.formState.errors.end ? <p className="text-xs text-destructive">{form.formState.errors.end.message}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="schedule-subject">Subject</Label>
              <Select id="schedule-subject" {...form.register('subjectId')}>
                <option value="">No subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-task">Task</Label>
              <Select id="schedule-task" {...form.register('taskId')}>
                <option value="">No task</option>
                {tasks
                  .filter((task) => task.status !== 'done')
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="schedule-note">Note</Label>
            <Input id="schedule-note" placeholder="Chapter 6 problems" {...form.register('note')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{schedule ? 'Save changes' : 'Add to planner'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
