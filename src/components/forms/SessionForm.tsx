import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import type { StudySession, Subject } from '@shared/types'

const schema = z.object({
  subjectId: z.string(),
  topic: z.string().max(160),
  date: z.string().min(1, 'Pick a date'),
  time: z.string().min(1, 'Pick a start time'),
  minutes: z.number().min(1, 'At least one minute').max(1440, 'Maximum 24 hours'),
  type: z.enum(['focus', 'manual']),
  notes: z.string().max(5000),
  completed: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function localDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function localTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function SessionForm({
  open,
  onOpenChange,
  session,
  subjects,
  defaultSubjectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: StudySession | null
  subjects: Subject[]
  defaultSubjectId?: string
}) {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const now = new Date()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subjectId: defaultSubjectId ?? '',
      topic: '',
      date: localDate(now.toISOString()),
      time: localTime(now.toISOString()),
      minutes: 30,
      type: 'manual',
      notes: '',
      completed: true,
    },
  })

  useEffect(() => {
    if (!open) return
    if (session) {
      form.reset({
        subjectId: session.subjectId ?? '',
        topic: session.topic,
        date: localDate(session.startTime),
        time: localTime(session.startTime),
        minutes: Math.max(1, Math.round(session.durationSeconds / 60)),
        type: session.type === 'focus' ? 'focus' : 'manual',
        notes: session.notes,
        completed: session.completed,
      })
    } else {
      form.reset({
        subjectId: defaultSubjectId ?? '',
        topic: '',
        date: localDate(new Date().toISOString()),
        time: localTime(new Date().toISOString()),
        minutes: 30,
        type: 'manual',
        notes: '',
        completed: true,
      })
    }
  }, [open, session, defaultSubjectId, form])

  const submit = form.handleSubmit(async (values) => {
    const start = new Date(`${values.date}T${values.time}:00`)
    if (Number.isNaN(start.getTime())) {
      toast.error('Invalid start time', 'Check the date and time values.')
      return
    }
    const end = new Date(start.getTime() + values.minutes * 60_000)
    const payload = {
      subjectId: values.subjectId || null,
      chapterId: session?.chapterId ?? null,
      topic: values.topic.trim(),
      type: values.type,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSeconds: Math.round(values.minutes * 60),
      notes: values.notes,
      completed: values.completed,
    }
    try {
      if (session) await api.sessions.update(session.id, payload)
      else await api.sessions.create(payload)
      toast.success(session ? 'Session updated' : 'Session saved', `${values.minutes} minutes recorded.`)
      bumpRefresh()
      onOpenChange(false)
    } catch (error) {
      toast.error('Could not save session', error instanceof Error ? error.message : undefined)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit study session' : 'Log a study session'}</DialogTitle>
          <DialogDescription>Manual sessions count toward your goals, streaks and analytics.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="session-topic">What did you study?</Label>
            <Input id="session-topic" placeholder="Chapter 4 — integration by parts" {...form.register('topic')} />
            {form.formState.errors.topic ? <p className="text-xs text-destructive">{form.formState.errors.topic.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="session-subject">Subject</Label>
              <Select id="session-subject" {...form.register('subjectId')}>
                <option value="">No subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-type">Session type</Label>
              <Select id="session-type" {...form.register('type')}>
                <option value="manual">Manual study</option>
                <option value="focus">Pomodoro focus</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="session-date">Date</Label>
              <Input id="session-date" type="date" {...form.register('date')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-time">Start</Label>
              <Input id="session-time" type="time" {...form.register('time')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-minutes">Minutes</Label>
              <Input id="session-minutes" type="number" min={1} max={1440} {...form.register('minutes', { valueAsNumber: true })} />
            </div>
          </div>
          {Object.values(form.formState.errors).length > 0 ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.minutes?.message ?? form.formState.errors.date?.message ?? form.formState.errors.time?.message}
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="session-notes">Notes</Label>
            <Textarea id="session-notes" placeholder="What clicked? What needs another pass?" {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{session ? 'Save changes' : 'Log session'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
