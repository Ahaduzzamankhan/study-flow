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
import type { Subject, Task } from '@shared/types'

const schema = z.object({
  title: z.string().trim().min(2, 'Give the task a title').max(120),
  description: z.string().max(5000),
  subjectId: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string(),
  estimatedMinutes: z.number().min(0).max(10_000),
  status: z.enum(['todo', 'in_progress', 'done']),
  notes: z.string().max(5000),
})

type FormValues = z.infer<typeof schema>

export function TaskForm({
  open,
  onOpenChange,
  task,
  subjects,
  defaultSubjectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  subjects: Subject[]
  defaultSubjectId?: string
}) {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      subjectId: defaultSubjectId ?? '',
      priority: 'medium',
      dueDate: '',
      estimatedMinutes: 30,
      status: 'todo',
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      task
        ? {
            title: task.title,
            description: task.description,
            subjectId: task.subjectId ?? '',
            priority: task.priority,
            dueDate: task.dueDate ?? '',
            estimatedMinutes: task.estimatedMinutes,
            status: task.status,
            notes: task.notes,
          }
        : {
            title: '',
            description: '',
            subjectId: defaultSubjectId ?? '',
            priority: 'medium',
            dueDate: '',
            estimatedMinutes: 30,
            status: 'todo',
            notes: '',
          },
    )
  }, [open, task, defaultSubjectId, form])

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim(),
      description: values.description,
      subjectId: values.subjectId || null,
      chapterId: task?.chapterId ?? null,
      priority: values.priority,
      dueDate: values.dueDate || null,
      estimatedMinutes: Math.round(values.estimatedMinutes),
      status: values.status,
      notes: values.notes,
    }
    try {
      if (task) await api.tasks.update(task.id, payload)
      else await api.tasks.create(payload)
      toast.success(task ? 'Task updated' : 'Task created', values.title)
      bumpRefresh()
      onOpenChange(false)
    } catch (error) {
      toast.error('Could not save task', error instanceof Error ? error.message : undefined)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New study task'}</DialogTitle>
          <DialogDescription>Plan what to study and when it is due.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" placeholder="Finish problem set 7" {...form.register('title')} />
            {form.formState.errors.title ? <p className="text-xs text-destructive">{form.formState.errors.title.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-subject">Subject</Label>
              <Select id="task-subject" {...form.register('subjectId')}>
                <option value="">No subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" {...form.register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" {...form.register('dueDate')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-estimate">Estimate (min)</Label>
              <Input id="task-estimate" type="number" min={0} step={5} {...form.register('estimatedMinutes', { valueAsNumber: true })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-status">Status</Label>
              <Select id="task-status" {...form.register('status')}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" placeholder="Break it into a first step" {...form.register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{task ? 'Save changes' : 'Create task'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
