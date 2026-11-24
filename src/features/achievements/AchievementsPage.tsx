import { Award, Lock, Sparkles, Trophy } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/stores/appStore'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, EmptyState, Progress } from '@/components/ui/primitives'
import { formatDuration, levelFromXp } from '@shared/stats'
import { cn, shortDate } from '@/lib/utils'
import type { AchievementState } from '@shared/types'

export function AchievementsPage() {
  const settings = useSettings()
  const { data: achievements } = useAsync(() => api.stats.achievements(), [])
  const { data: overview } = useAsync(() => api.stats.overview(), [])

  const unlocked = (achievements ?? []).filter((item) => item.unlockedAt)
  const locked = (achievements ?? []).filter((item) => !item.unlockedAt)
  const level = levelFromXp(overview?.level.xp ?? 0)

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Achievements"
        subtitle="Milestones earned from real study history."
        actions={<Badge tone="accent">{unlocked.length} unlocked</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] blur-2xl" />
          <CardContent className="relative flex items-center gap-5 p-6">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-soft">
              <span className="font-display text-2xl font-extrabold">{level.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your level</p>
              <p className="font-display text-2xl font-extrabold">Level {level.level} · {level.xp} XP</p>
              <div className="mt-2">
                <Progress value={level.progress} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{level.nextLevelXp - level.xp} XP to level {level.level + 1}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study totals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="font-display text-xl font-extrabold">{formatDuration(overview?.totalSeconds ?? 0)}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Studied</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="font-display text-xl font-extrabold">{overview?.totalSessions ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sessions</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="font-display text-xl font-extrabold">{overview?.longestStreak ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Best streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!settings.gamification ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Gamification is switched off in Settings. Your progress is still tracked and badges keep unlocking.
          </CardContent>
        </Card>
      ) : null}

      {(achievements ?? []).length === 0 ? (
        <EmptyState icon={<Trophy className="h-5 w-5" />} title="No achievements loaded" description="Log a study session to start unlocking badges." />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Unlocked</h2>
            {unlocked.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet — your first session unlocks “First Step”.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {unlocked.map((item) => (
                  <AchievementCard key={item.key} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">In progress</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {locked.map((item) => (
                <AchievementCard key={item.key} item={item} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function AchievementCard({ item }: { item: AchievementState }) {
  const unlocked = Boolean(item.unlockedAt)
  const percent = Math.min(100, Math.round((item.progress / item.target) * 100))
  return (
    <Card className={cn('h-full', unlocked && 'border-primary/40 bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))]')}>
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <span
            className={cn(
              'grid h-11 w-11 place-items-center rounded-2xl',
              unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {unlocked ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
          </span>
          <Badge tone={unlocked ? 'success' : 'outline'}>{unlocked ? 'Unlocked' : `${item.xp} XP`}</Badge>
        </div>
        <div>
          <p className="font-display text-base font-bold">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
        <div className="mt-auto">
          <Progress value={percent} indicatorClassName={unlocked ? 'bg-emerald-500' : undefined} />
          <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
            {unlocked && item.unlockedAt ? `Unlocked ${shortDate(item.unlockedAt)}` : `${Math.round(item.progress)} / ${item.target}`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
