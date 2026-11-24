import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </motion.header>
  )
}
