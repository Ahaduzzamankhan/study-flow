import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export function Badge({
  className,
  tone = 'muted',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'muted' | 'primary' | 'accent' | 'success' | 'danger' | 'outline' }) {
  const tones: Record<string, string> = {
    muted: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/25 text-accent-foreground',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    danger: 'bg-destructive/15 text-destructive',
    outline: 'border border-border text-muted-foreground',
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', tones[tone], className)}
      {...props}
    />
  )
}

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number
  className?: string
  indicatorClassName?: string
}) {
  return (
    <ProgressPrimitive.Root className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-muted', className)} value={value}>
      <ProgressPrimitive.Indicator
        className={cn('h-full w-full flex-1 rounded-full bg-primary transition-transform duration-500', indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex items-center gap-1 rounded-2xl bg-muted/70 p-1', className)}
    {...props}
  />
))
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = TabsPrimitive.Content

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded-xl bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background shadow-card"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-foreground" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      {icon ? <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card text-primary shadow-soft">{icon}</div> : null}
      <div>
        <p className="font-display text-base font-bold">{title}</p>
        {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-border', className)} />
}
