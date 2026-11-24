import { useMemo } from 'react'
import { addDays, dateKey, todayKey } from '@shared/stats'
import { cn } from '@/lib/utils'
import { formatDuration } from '@shared/stats'
import { Tooltip } from '@/components/ui/primitives'

const LEVEL_STYLES = [
  'bg-muted/80',
  'bg-[color-mix(in_srgb,var(--primary)_28%,transparent)]',
  'bg-[color-mix(in_srgb,var(--primary)_48%,transparent)]',
  'bg-[color-mix(in_srgb,var(--primary)_70%,transparent)]',
  'bg-primary',
]

function levelFor(seconds: number): number {
  if (seconds <= 0) return 0
  if (seconds < 30 * 60) return 1
  if (seconds < 2 * 3600) return 2
  if (seconds < 4 * 3600) return 3
  return 4
}

export function Heatmap({ data, weeks = 53 }: { data: Record<string, number>; weeks?: number }) {
  const days = useMemo(() => {
    const today = new Date(`${todayKey()}T00:00:00`)
    const cells: { key: string; seconds: number; weekday: number }[] = []
    const total = weeks * 7
    const startOffset = (today.getDay() + 6) % 7
    const start = addDays(dateKey(today), -(total - 1 - startOffset))
    for (let index = 0; index < total; index += 1) {
      const key = addDays(start, index)
      const date = new Date(`${key}T00:00:00`)
      cells.push({ key, seconds: data[key] ?? 0, weekday: (date.getDay() + 6) % 7 })
    }
    return cells
  }, [data, weeks])

  const columns: typeof days[] = []
  for (let index = 0; index < days.length; index += 7) {
    columns.push(days.slice(index, index + 7))
  }

  const monthLabels = columns.map((column) => {
    const first = column[0]
    if (!first) return ''
    const date = new Date(`${first.key}T00:00:00`)
    return date.getDate() <= 7 ? date.toLocaleDateString(undefined, { month: 'short' }) : ''
  })

  return (
    <div className="w-full">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        <div className="mr-1 flex flex-col gap-[3px] pt-5 text-[10px] font-semibold text-muted-foreground">
          <span className="h-[12px]" />
          <span className="h-[12px]">Mon</span>
          <span className="h-[12px]" />
          <span className="h-[12px]">Wed</span>
          <span className="h-[12px]" />
          <span className="h-[12px]">Fri</span>
          <span className="h-[12px]" />
        </div>
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-[3px]">
            <span className="h-4 text-[9px] font-semibold text-muted-foreground">{monthLabels[columnIndex]}</span>
            {column.map((day) => (
              <Tooltip key={day.key} label={`${day.key} · ${day.seconds > 0 ? formatDuration(day.seconds) : 'No study'}`}>
                <button
                  type="button"
                  aria-label={`${day.key}: ${formatDuration(day.seconds)} studied`}
                  className={cn(
                    'h-[12px] w-[12px] cursor-pointer rounded-[3px] transition-transform hover:scale-125',
                    LEVEL_STYLES[levelFor(day.seconds)],
                    day.key === todayKey() && 'ring-1 ring-primary ring-offset-1 ring-offset-card',
                  )}
                />
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <span>Less</span>
        {LEVEL_STYLES.map((style, index) => (
          <span key={index} className={cn('h-[10px] w-[10px] rounded-[3px]', style)} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
