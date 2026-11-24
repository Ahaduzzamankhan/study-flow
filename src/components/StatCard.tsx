import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = 'primary',
  delay = 0,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  accent?: 'primary' | 'sky' | 'rose' | 'mint' | 'peach'
  delay?: number
}) {
  const tones: Record<string, string> = {
    primary: 'bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary',
    sky: 'bg-sky-400/15 text-sky-600 dark:text-sky-300',
    rose: 'bg-rose-400/15 text-rose-500 dark:text-rose-300',
    mint: 'bg-emerald-400/15 text-emerald-600 dark:text-emerald-300',
    peach: 'bg-orange-400/15 text-orange-600 dark:text-orange-300',
  }
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
      <Card className="relative overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-extrabold leading-none">{value}</p>
            {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', tones[accent])}>{icon}</span>
        </div>
      </Card>
    </motion.div>
  )
}
