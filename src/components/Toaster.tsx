import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, PartyPopper, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

const icons = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  achievement: PartyPopper,
}

const tones = {
  default: 'border-border bg-card',
  success: 'border-emerald-400/40 bg-emerald-50/90 dark:bg-emerald-950/60',
  error: 'border-destructive/40 bg-rose-50/90 dark:bg-rose-950/60',
  achievement: 'border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))]',
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[22rem] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const Icon = icons[item.tone]
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-card backdrop-blur ${tones[item.tone]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
