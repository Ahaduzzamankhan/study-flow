import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckSquare, ListChecks, NotebookPen, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { shortDate } from '@/lib/utils'
import type { Note, StudySession, Subject, Task } from '@shared/types'

interface Result {
  id: string
  title: string
  subtitle: string
  group: 'Subjects' | 'Tasks' | 'Sessions' | 'Notes'
  to: string
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    Promise.all([api.subjects.list(), api.tasks.list(), api.sessions.list({ limit: 300 }), api.notes.list()])
      .then(([subjectRows, taskRows, sessionRows, noteRows]) => {
        if (!active) return
        setSubjects(subjectRows)
        setTasks(taskRows)
        setSessions(sessionRows)
        setNotes(noteRows)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open])

  const results = useMemo<Result[]>(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    const matches: Result[] = []
    for (const subject of subjects) {
      if (subject.name.toLowerCase().includes(term)) {
        matches.push({ id: subject.id, title: subject.name, subtitle: 'Subject', group: 'Subjects', to: '/subjects' })
      }
    }
    for (const task of tasks) {
      if (`${task.title} ${task.description}`.toLowerCase().includes(term)) {
        matches.push({
          id: task.id,
          title: task.title,
          subtitle: `${task.status.replace('_', ' ')}${task.dueDate ? ` · due ${shortDate(task.dueDate)}` : ''}`,
          group: 'Tasks',
          to: '/tasks',
        })
      }
    }
    for (const note of notes) {
      if (`${note.title} ${note.content}`.toLowerCase().includes(term)) {
        matches.push({ id: note.id, title: note.title, subtitle: 'Note', group: 'Notes', to: '/notes' })
      }
    }
    for (const session of sessions) {
      if (`${session.topic} ${session.notes}`.toLowerCase().includes(term)) {
        matches.push({
          id: session.id,
          title: session.topic || 'Untitled session',
          subtitle: `${shortDate(session.startTime)} · ${Math.round(session.durationSeconds / 60)} min`,
          group: 'Sessions',
          to: '/sessions',
        })
      }
    }
    return matches.slice(0, 24)
  }, [query, subjects, tasks, sessions, notes])

  const icons = { Subjects: BookOpen, Tasks: CheckSquare, Sessions: ListChecks, Notes: NotebookPen }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Search StudyFlow</DialogTitle>
          <DialogDescription>Subjects, tasks, sessions and notes — all offline.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to search…"
            className="pl-9"
            aria-label="Search StudyFlow"
          />
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {loading ? <p className="p-3 text-sm text-muted-foreground">Loading your workspace…</p> : null}
          {!loading && query.trim() && results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches for “{query.trim()}”.</p>
          ) : null}
          {results.map((result) => {
            const Icon = icons[result.group]
            return (
              <button
                key={`${result.group}-${result.id}`}
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  navigate(result.to)
                }}
                className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-muted"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{result.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
