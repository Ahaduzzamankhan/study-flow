import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarCheck, Clock, Download, FileJson, Flame, Gauge, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, EmptyState, Progress } from '@/components/ui/primitives'
import { addDays, formatDuration, startOfMonthKey, todayKey } from '@shared/stats'
import { shortDate } from '@/lib/utils'

export function AnalyticsPage() {
  const today = todayKey()
  const yearAgo = addDays(today, -364)

  const { data: summary } = useAsync(() => api.stats.analytics(), [])
  const { data: daily } = useAsync(() => api.stats.daily(yearAgo, today), [yearAgo, today])
  const { data: subjects } = useAsync(() => api.stats.subjects(), [])
  const { data: overview } = useAsync(() => api.stats.overview(), [])

  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    for (const day of daily ?? []) {
      const key = day.date.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + day.seconds)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, seconds]) => ({
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' }),
        hours: Math.round((seconds / 3600) * 10) / 10,
      }))
  }, [daily])

  const weekdayAverages = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))
    for (const day of daily ?? []) {
      const weekday = (new Date(`${day.date}T00:00:00`).getDay() + 6) % 7
      const bucket = buckets[weekday]
      if (!bucket) continue
      bucket.total += day.seconds
      if (day.seconds > 0) bucket.count += 1
    }
    return buckets.map((bucket, index) => ({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
      minutes: bucket.count ? Math.round(bucket.total / bucket.count / 60) : 0,
    }))
  }, [daily])

  const exportData = async (format: 'csv' | 'json'): Promise<void> => {
    try {
      const result = await api.data.exportData(format)
      if (!result.canceled) toast.success(`Exported ${format.toUpperCase()}`, result.path)
    } catch (error) {
      toast.error('Export failed', error instanceof Error ? error.message : undefined)
    }
  }

  const subjectMax = Math.max(1, ...(subjects ?? []).map((subject) => subject.seconds))

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Study Analytics"
        subtitle={`Real numbers from ${overview?.totalSessions ?? 0} sessions since you started.`}
        actions={
          <>
            <Button variant="outline" onClick={() => void exportData('csv')}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => void exportData('json')}>
              <FileJson className="h-4 w-4" /> JSON
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<Clock className="h-5 w-5" />} label="Total study time" value={formatDuration(summary?.totalSeconds ?? 0)} hint={`${summary?.activeDays ?? 0} active days`} />
        <StatCard icon={<Gauge className="h-5 w-5" />} label="Daily average" value={formatDuration(summary?.dailyAverage ?? 0)} hint="Across active days" accent="sky" delay={0.04} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Weekly average" value={formatDuration(summary?.weeklyAverage ?? 0)} hint={`Monthly ${formatDuration(summary?.monthlyAverage ?? 0)}`} accent="mint" delay={0.08} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Longest session" value={formatDuration(summary?.longestSessionSeconds ?? 0)} hint={`${overview?.streak ?? 0} day current streak`} accent="rose" delay={0.12} />
        <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Completion rate" value={`${summary?.completionRate ?? 0}%`} hint={`${summary?.activeDays ?? 0} days with study`} accent="peach" delay={0.16} />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Focus vs break"
          value={formatDuration(summary?.focusSeconds ?? 0)}
          hint={`Breaks ${formatDuration(summary?.breakSeconds ?? 0)}`}
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily study trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {(daily ?? []).some((day) => day.seconds > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={(daily ?? []).slice(-60).map((day) => ({ label: shortDate(`${day.date}T00:00:00`), minutes: Math.round(day.seconds / 60) }))}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" interval={9} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" />
                  <ChartTooltip
                    contentStyle={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
                    formatter={(value: number) => [`${value} min`, 'Studied']}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="var(--primary)" strokeWidth={2.5} fill="url(#analyticsArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="No data yet" description="Your trend line appears after a few sessions." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly hours</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {monthly.some((month) => month.hours > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <ChartTooltip
                    contentStyle={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
                    formatter={(value: number) => [`${value} h`, 'Studied']}
                  />
                  <Bar dataKey="hours" radius={[8, 8, 4, 4]} fill="var(--ring)" maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<Gauge className="h-5 w-5" />} title="No monthly data" description="Keep studying and this fills in." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subject comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(subjects ?? []).filter((subject) => subject.seconds > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">Link sessions to subjects to compare them.</p>
            ) : (
              (subjects ?? [])
                .filter((subject) => subject.seconds > 0)
                .map((subject) => (
                  <div key={subject.subjectId}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                        {subject.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDuration(subject.seconds)} · {subject.sessions} sessions
                      </span>
                    </div>
                    <Progress value={(subject.seconds / subjectMax) * 100} indicatorClassName="bg-[var(--ring)]" />
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best day of the week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {weekdayAverages.some((day) => day.minutes > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayAverages} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <ChartTooltip
                    contentStyle={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
                    formatter={(value: number) => [`${value} min`, 'Average']}
                  />
                  <Bar dataKey="minutes" radius={[8, 8, 4, 4]} maxBarSize={30}>
                    {weekdayAverages.map((day, index) => (
                      <Cell key={day.label} fill={index === new Date().getDay() - 1 ? 'var(--primary)' : 'var(--secondary)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="Not enough data" description="Track a week to see your strongest days." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Highlights</CardTitle>
          <Badge tone="primary">{startOfMonthKey(today)} onwards</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Most studied subject</p>
            <p className="mt-1 font-display text-lg font-bold">{summary?.mostStudiedSubject?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              {summary?.mostStudiedSubject ? formatDuration(summary.mostStudiedSubject.seconds) : 'No subject data yet'}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Most productive day</p>
            <p className="mt-1 font-display text-lg font-bold">
              {summary?.mostProductiveDay ? shortDate(`${summary.mostProductiveDay.date}T00:00:00`) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary?.mostProductiveDay ? formatDuration(summary.mostProductiveDay.seconds) : 'No sessions yet'}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Level</p>
            <p className="mt-1 font-display text-lg font-bold">Level {overview?.level.level ?? 1}</p>
            <div className="mt-1">
              <Progress value={overview?.level.progress ?? 0} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{overview?.level.xp ?? 0} XP earned</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
