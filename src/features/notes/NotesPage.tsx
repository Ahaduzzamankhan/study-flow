import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, FileText, NotebookPen, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Badge, EmptyState, Separator } from '@/components/ui/primitives'
import { renderMarkdown } from '@/lib/markdown'
import { cn, shortDate, timeOfDay } from '@/lib/utils'

export function NotesPage() {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const { data: notes } = useAsync(() => api.notes.list(), [])
  const { data: subjects } = useAsync(() => api.subjects.list(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [preview, setPreview] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const savedRef = useRef<string>('')

  const filtered = useMemo(
    () =>
      (notes ?? []).filter((note) => {
        if (subjectFilter && note.subjectId !== subjectFilter) return false
        if (search.trim() && !`${note.title} ${note.content}`.toLowerCase().includes(search.trim().toLowerCase())) return false
        return true
      }),
    [notes, search, subjectFilter],
  )

  const selected = useMemo(() => (notes ?? []).find((note) => note.id === selectedId) ?? null, [notes, selectedId])

  useEffect(() => {
    if (!selected) return
    setTitle(selected.title)
    setContent(selected.content)
    setSubjectId(selected.subjectId ?? '')
    setPinned(selected.pinned)
    savedRef.current = `${selected.title}|${selected.content}|${selected.subjectId ?? ''}|${selected.pinned}`
  }, [selected])

  useEffect(() => {
    if (!selected) return
    const signature = `${title}|${content}|${subjectId}|${pinned}`
    if (signature === savedRef.current) return
    setSaving(true)
    const timeout = window.setTimeout(async () => {
      try {
        await api.notes.update(selected.id, {
          title: title.trim() || 'Untitled note',
          content,
          subjectId: subjectId || null,
          pinned,
        })
        savedRef.current = signature
        bumpRefresh()
      } catch (error) {
        toast.error('Autosave failed', error instanceof Error ? error.message : undefined)
      } finally {
        setSaving(false)
      }
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [title, content, subjectId, pinned, selected, bumpRefresh])

  const createNote = async (): Promise<void> => {
    try {
      const note = await api.notes.create({ title: 'Untitled note', content: '', subjectId: null, pinned: false })
      setSelectedId(note.id)
      setPreview(false)
      bumpRefresh()
      toast.success('Note created', 'Start typing — it saves automatically.')
    } catch (error) {
      toast.error('Could not create note', error instanceof Error ? error.message : undefined)
    }
  }

  const removeNote = async (): Promise<void> => {
    if (!selected) return
    try {
      await api.notes.remove(selected.id)
      setSelectedId(null)
      bumpRefresh()
      toast.success('Note deleted')
    } catch (error) {
      toast.error('Could not delete note', error instanceof Error ? error.message : undefined)
    }
  }

  const subjectName = (id: string | null): string | undefined => (subjects ?? []).find((subject) => subject.id === id)?.name

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Notes & Journal"
        subtitle="Markdown notes, pinned ideas and a daily study journal — stored locally."
        actions={
          <Button onClick={() => void createNote()}>
            <Plus className="h-4 w-4" /> New note
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes…" className="pl-9" />
          </div>
          <Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
            <option value="">All subjects</option>
            {(subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>

          <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {(notes ?? []).length === 0 ? 'No notes yet. Create your first one.' : 'No notes match this search.'}
              </p>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={cn(
                    'w-full rounded-2xl border p-3 text-left transition-colors',
                    selectedId === note.id ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {note.pinned ? <Pin className="h-3 w-3 shrink-0 text-primary" /> : null}
                    <span className="truncate text-sm font-bold">{note.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.content || 'Empty note'}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {shortDate(note.updatedAt)} · {timeOfDay(note.updatedAt)}
                    {subjectName(note.subjectId) ? ` · ${subjectName(note.subjectId)}` : ''}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <Card className="min-h-[32rem]">
          {!selected ? (
            <CardContent className="grid h-full place-items-center p-8">
              <EmptyState
                icon={<NotebookPen className="h-5 w-5" />}
                title="No note selected"
                description="Pick a note on the left, or create a new one to start writing."
                action={<Button onClick={() => void createNote()}>New note</Button>}
              />
            </CardContent>
          ) : (
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 flex-1 border-none bg-transparent px-0 font-display text-xl font-bold shadow-none focus-visible:ring-0"
                  placeholder="Note title"
                />
                <Badge tone={saving ? 'primary' : 'muted'}>{saving ? 'Saving…' : 'Saved'}</Badge>
                <Button variant="ghost" size="icon-sm" aria-label={pinned ? 'Unpin note' : 'Pin note'} onClick={() => setPinned((value) => !value)}>
                  {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={preview ? 'Edit note' : 'Preview markdown'} onClick={() => setPreview((value) => !value)}>
                  {preview ? <FileText className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete note" onClick={() => void removeNote()}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="max-w-xs">
                <option value="">No subject</option>
                {(subjects ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
              <Separator />
              {preview ? (
                <div
                  className="prose-sm max-w-none flex-1 overflow-y-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              ) : (
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={'# Heading\n\nWrite your notes in Markdown…\n\n- Key idea\n- Practice problem 3'}
                  className="min-h-[22rem] flex-1 resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
