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
import { ICON_NAMES, IconFor } from '@/lib/icons'
import type { Subject } from '@shared/types'

const COLORS = ['#8B7CF6', '#6CB8F6', '#F48FB6', '#6FD3B6', '#F8A96E', '#5B6BC0', '#E4576F', '#3E4C9A']

const schema = z.object({
  name: z.string().trim().min(2, 'Name the subject').max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1),
  description: z.string().max(2000),
  targetHours: z.number().min(0).max(10_000),
})

type FormValues = z.infer<typeof schema>

export function SubjectForm({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: Subject | null
}) {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: COLORS[0] as string, icon: 'book', description: '', targetHours: 0 },
  })
  const color = form.watch('color')
  const icon = form.watch('icon')

  useEffect(() => {
    if (!open) return
    form.reset(
      subject
        ? {
            name: subject.name,
            color: subject.color,
            icon: subject.icon,
            description: subject.description,
            targetHours: subject.targetHours,
          }
        : { name: '', color: COLORS[0] as string, icon: 'book', description: '', targetHours: 0 },
    )
  }, [open, subject, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      if (subject) await api.subjects.update(subject.id, values)
      else await api.subjects.create(values)
      toast.success(subject ? 'Subject updated' : 'Subject added', values.name)
      bumpRefresh()
      onOpenChange(false)
    } catch (error) {
      toast.error('Could not save subject', error instanceof Error ? error.message : undefined)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? 'Edit subject' : 'Add a subject'}</DialogTitle>
          <DialogDescription>Colour and icon make the subject easy to spot in charts.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subject-name">Subject name</Label>
            <Input id="subject-name" placeholder="Mathematics" {...form.register('name')} />
            {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue('color', value)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: value, borderColor: color === value ? 'var(--foreground)' : 'transparent' }}
                  aria-label={`Use colour ${value}`}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject-icon">Icon</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select id="subject-icon" className="max-w-[9rem]" {...form.register('icon')}>
                {ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ backgroundColor: `${color}22`, color }}>
                <IconFor name={icon} className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject-target">Target study hours</Label>
            <Input id="subject-target" type="number" min={0} step={1} {...form.register('targetHours', { valueAsNumber: true })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject-description">Description</Label>
            <Textarea id="subject-description" placeholder="What does this subject cover?" {...form.register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{subject ? 'Save changes' : 'Add subject'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
