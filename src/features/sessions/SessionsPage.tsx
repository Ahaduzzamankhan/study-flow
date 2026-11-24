import { useMemo, useState } from 'react'
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Badge, EmptyState, Separator } from '@/components/ui/primitives'
import { SessionForm } from '@/components/forms/SessionForm'
import { addDays, formatDuration, todayKey } from '@shared/stats'
import { shortDate, timeOfDay } from '@/lib/utils'
import type { StudySession } from '@shared/types'

const RANGES = { '7': 7, '30': 30, '90': 90, all: 3650 } as const

export function SessionsPage() {
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [range, setRange] = useState<keyof typeof RANGES>('30')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StudySession | null>(null)

  const { data: sessions } = useAsync(() => api.sessions.list({ limit: 2000 }), [])
  const { data: subjects } = useAsync(() => api.subjects.list(), [])

  const subjectById = useMemo(() => new Map((subjects ?? []).map((subject) => [subject.id, subject])), [subjects])
  const cutoff = addDays(todayKey(), -RANGES[range])

  const filtered = useMemo(() => {
    return (sessions ?? []).filter((session) => {
      if (session.startTime.slice(0, 10) < cutoff && range !== 'all') return false
      if (subjectFilter && session.subjectId !== subjectFilter) return false
      if (typeFilter && session.type !== typeFilter) return false
      if (search.trim()) {
        const haystack = `${session.topic} ${session.notes} ${session.subjectId ? subjectById.get(session.subjectId)?.name ?? '' : ''}`.toLowerCase()
        if (!haystack.includes(search.trim().toLowerCase())) return false
      }
      return true
    })
  }, [sessions, cutoff, range, subjectFilter, typeFilter, search, subjectById])

  const grouped = useMemo(() => {
    const map = new Map<string, StudySession[]>()
    for (const session of filtered) {
      const key = session.startTime.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(session)
      map.set(key, list)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const studyTotal = filtered
    .filter((session) => session.type === 'focus' || session.type === 'manual')
    .reduce((sum, session) => sum + session.durationSeconds, 0)

  const remove = async (session: StudySession): Promise<void> => {
    try {
      await api.sessions.remove(session.id)
      toast.success('Session deleted', `${shortDate(session.startTime)} · ${formatDuration(session.durationSeconds)}`)
      bumpRefresh()
    } catch (error) {
      toast.error('Could not delete session', error instanceof Error ? error.message : undefined)
    }
  }

  const exportSessions = async (): Promise<void> => {
    try {
      const result = await api.data.exportData('csv')
      if (!result.canceled) toast.success('Sessions exported', result.path)
    } catch (error) {
      toast.error('Export failed', error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Study Sessions"
        subtitle="Every focus block and manual entry, recalculated from real timestamps."
        actions={
          <>
            <Button variant="outline" onClick={() => void exportSessions()}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Log session
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total in range</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{formatDuration(studyTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sessions</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Average session</p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {filtered.length ? formatDuration(Math.round(studyTotal / filtered.length)) : '0m'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search topic or notes…" className="pl-9" />
          </div>
          <Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="max-w-[12rem]">
            <option value="">All subjects</option>
            {(subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="max-w-[10rem]">
            <option value="">All types</option>
            <option value="focus">Focus</option>
            <option value="manual">Manual</option>
            <option value="short_break">Short break</option>
            <option value="long_break">Long break</option>
          </Select>
          <Select value={range} onChange={(event) => setRange(event.target.value as keyof typeof RANGES)} className="max-w-[9rem]">
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="all">All time</option>
          </Select>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-5 w-5" />}
          title="No sessions in this range"
          description="Log a session manually or run the timer to build your history."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Log your first session
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, daySessions]) => {
            const dayTotal = daySessions.reduce((sum, session) => sum + session.durationSeconds, 0)
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="font-display text-sm font-bold">
                    {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <Badge tone="primary">{formatDuration(dayTotal)}</Badge>
                </div>
                <Card>
                  <CardContent className="divide-y divide-border p-0">
                    {daySessions.map((session) => {
                      const subject = session.subjectId ? subjectById.get(session.subjectId) : undefined
                      return (
                        <div key={session.id} className="flex items-center gap-3 p-3.5">
                          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: subject?.color ?? 'var(--muted)' }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{session.topic || subject?.name || 'Study session'}</p>
                            <p className="text-xs text-muted-foreground">
                              {timeOfDay(session.startTime)} — {timeOfDay(session.endTime)}
                              {subject ? ` · ${subject.name}` : ''}
                              {session.notes ? ` · ${session.notes.slice(0, 60)}` : ''}
                            </p>
                          </div>
                          <Badge tone={session.type === 'focus' ? 'primary' : session.type === 'manual' ? 'accent' : 'muted'}>
                            {formatDuration(session.durationSeconds)}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit session"
                              onClick={() => {
                                setEditing(session)
                                setFormOpen(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label="Delete session" onClick={() => void remove(session)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      <Separator className="opacity-0" />
      <SessionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        session={editing}
        subjects={subjects ?? []}
      />
    </div>
  )
}
