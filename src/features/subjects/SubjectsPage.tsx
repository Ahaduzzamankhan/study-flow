import { useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, Circle, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState, Progress, Separator } from '@/components/ui/primitives'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { SubjectForm } from '@/components/forms/SubjectForm'
import { IconFor } from '@/lib/icons'
import { formatDuration, todayKey, startOfWeekKey } from '@shared/stats'
import type { Chapter, Subject } from '@shared/types'

export function SubjectsPage() {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [chaptersFor, setChaptersFor] = useState<Subject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)

  const { data: subjects } = useAsync(() => api.subjects.list(), [])
  const { data: chapters } = useAsync(() => api.chapters.list(null), [])
  const { data: sessions } = useAsync(() => api.sessions.list({ limit: 3000 }), [])

  const weekStart = startOfWeekKey(todayKey())
  const today = todayKey()

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; sessions: number; week: number; month: number }>()
    for (const subject of subjects ?? []) map.set(subject.id, { total: 0, sessions: 0, week: 0, month: 0 })
    for (const session of sessions ?? []) {
      if (!session.subjectId) continue
      if (session.type !== 'focus' && session.type !== 'manual') continue
      const entry = map.get(session.subjectId)
      if (!entry) continue
      entry.total += session.durationSeconds
      entry.sessions += 1
      const key = session.startTime.slice(0, 10)
      if (key >= weekStart && key <= today) entry.week += session.durationSeconds
      if (key.slice(0, 7) === today.slice(0, 7)) entry.month += session.durationSeconds
    }
    return map
  }, [subjects, sessions, weekStart, today])

  const remove = async (): Promise<void> => {
    if (!deleteTarget) return
    try {
      await api.subjects.remove(deleteTarget.id)
      toast.success('Subject deleted', deleteTarget.name)
      setDeleteTarget(null)
      bumpRefresh()
    } catch (error) {
      toast.error('Could not delete subject', error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Subjects"
        subtitle="Chapters, targets and study distribution for every subject you are carrying."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Add subject
          </Button>
        }
      />

      {(subjects ?? []).length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="No subjects yet"
          description="Add the subjects you are studying so sessions can be grouped and visualised."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Add your first subject
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(subjects ?? []).map((subject) => {
            const subjectChapters = (chapters ?? []).filter((chapter) => chapter.subjectId === subject.id)
            const completed = subjectChapters.filter((chapter) => chapter.status === 'completed').length
            const chapterProgress = subjectChapters.length ? Math.round((completed / subjectChapters.length) * 100) : 0
            const entry = stats.get(subject.id) ?? { total: 0, sessions: 0, week: 0, month: 0 }
            const targetSeconds = subject.targetHours * 3600
            const targetProgress = targetSeconds > 0 ? Math.min(100, Math.round((entry.total / targetSeconds) * 100)) : 0
            return (
              <Card key={subject.id} className="flex flex-col">
                <CardHeader className="flex-row items-start gap-3">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                    style={{ backgroundColor: `${subject.color}22`, color: subject.color }}
                  >
                    <IconFor name={subject.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{subject.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {subjectChapters.length} chapters · {entry.sessions} sessions
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${subject.name}`}
                      onClick={() => {
                        setEditing(subject)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${subject.name}`} onClick={() => setDeleteTarget(subject)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  {subject.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{subject.description}</p> : null}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-2xl bg-muted/50 p-2.5">
                      <p className="font-display text-lg font-extrabold">{formatDuration(entry.total)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-2.5">
                      <p className="font-display text-lg font-extrabold">{formatDuration(entry.week)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">This week</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] font-bold">
                      <span>Chapters</span>
                      <span className="text-muted-foreground">
                        {completed}/{subjectChapters.length}
                      </span>
                    </div>
                    <Progress value={chapterProgress} />
                  </div>
                  {targetSeconds > 0 ? (
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] font-bold">
                        <span>Target {subject.targetHours}h</span>
                        <span className="text-muted-foreground">{targetProgress}%</span>
                      </div>
                      <Progress value={targetProgress} indicatorClassName="bg-[var(--ring)]" />
                    </div>
                  ) : null}
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button variant="soft" size="sm" className="flex-1" onClick={() => setChaptersFor(subject)}>
                      Chapters
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setChaptersFor(subject)}>
                      Weekly {formatDuration(entry.week)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <SubjectForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        subject={editing}
      />

      <ChaptersDialog
        subject={chaptersFor}
        chapters={(chapters ?? []).filter((chapter) => chapter.subjectId === chaptersFor?.id)}
        onClose={() => setChaptersFor(null)}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Chapters are removed with the subject. Study sessions stay in your history but lose the subject link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep subject
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              Delete subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChaptersDialog({
  subject,
  chapters,
  onClose,
}: {
  subject: Subject | null
  chapters: Chapter[]
  onClose: () => void
}) {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const [title, setTitle] = useState('')

  const add = async (): Promise<void> => {
    if (!subject || title.trim().length < 1) return
    try {
      await api.chapters.create(subject.id, title.trim())
      setTitle('')
      bumpRefresh()
    } catch (error) {
      toast.error('Could not add chapter', error instanceof Error ? error.message : undefined)
    }
  }

  const toggle = async (chapter: Chapter): Promise<void> => {
    try {
      await api.chapters.update(chapter.id, { status: chapter.status === 'completed' ? 'pending' : 'completed' })
      bumpRefresh()
    } catch (error) {
      toast.error('Could not update chapter', error instanceof Error ? error.message : undefined)
    }
  }

  const remove = async (chapter: Chapter): Promise<void> => {
    try {
      await api.chapters.remove(chapter.id)
      bumpRefresh()
    } catch (error) {
      toast.error('Could not delete chapter', error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <Dialog open={Boolean(subject)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject?.name} chapters</DialogTitle>
          <DialogDescription>Track the syllabus one chapter at a time.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Chapter title"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void add()
              }
            }}
          />
          <Button onClick={() => void add()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Separator />
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {chapters.length === 0 ? <p className="text-sm text-muted-foreground">No chapters yet.</p> : null}
          {chapters.map((chapter) => (
            <div key={chapter.id} className="flex items-center gap-2 rounded-2xl border border-border p-2.5">
              <button type="button" onClick={() => void toggle(chapter)} aria-label={`Toggle ${chapter.title}`}>
                {chapter.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <span className={`flex-1 text-sm font-semibold ${chapter.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>
                {chapter.title}
              </span>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${chapter.title}`} onClick={() => void remove(chapter)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
