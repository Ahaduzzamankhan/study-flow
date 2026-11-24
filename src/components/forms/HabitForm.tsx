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
import { ICON_NAMES } from '@/lib/icons'
import type { Habit } from '@shared/types'

const COLORS = ['#8B7CF6', '#6CB8F6', '#F48FB6', '#6FD3B6', '#F8A96E']

const schema = z.object({
  name: z.string().trim().min(2, 'Name the habit').max(80),
  description: z.string().max(1000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export function HabitForm({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  habit?: Habit | null
}) {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', color: COLORS[0] as string, icon: 'repeat' },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      habit
        ? { name: habit.name, description: habit.description, color: habit.color, icon: habit.icon }
        : { name: '', description: '', color: COLORS[0] as string, icon: 'repeat' },
    )
  }, [open, habit, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      if (habit) await api.habits.update(habit.id, values)
      else await api.habits.create(values)
      toast.success(habit ? 'Habit updated' : 'Habit added', values.name)
      bumpRefresh()
      onOpenChange(false)
    } catch (error) {
      toast.error('Could not save habit', error instanceof Error ? error.message : undefined)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habit ? 'Edit habit' : 'Build a habit'}</DialogTitle>
          <DialogDescription>Small daily routines compound into serious progress.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="habit-name">Habit</Label>
            <Input id="habit-name" placeholder="Revise yesterday's chapter" {...form.register('name')} />
            {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="habit-icon">Icon</Label>
            <Select id="habit-icon" {...form.register('icon')}>
              {ICON_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue('color', value)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: value, borderColor: form.watch('color') === value ? 'var(--foreground)' : 'transparent' }}
                  aria-label={`Use colour ${value}`}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="habit-description">Why it matters</Label>
            <Textarea id="habit-description" placeholder="Optional note for future you" {...form.register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{habit ? 'Save changes' : 'Add habit'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
