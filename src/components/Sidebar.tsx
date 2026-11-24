import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronLeft,
  Flame,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Settings,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, useSettings } from '@/stores/appStore'
import { Tooltip } from '@/components/ui/primitives'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/timer', label: 'Study Timer', icon: Timer },
  { to: '/sessions', label: 'Study Sessions', icon: ListChecks },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/tasks', label: 'Tasks & Planner', icon: CheckSquare },
  { to: '/analytics', label: 'Study Analytics', icon: BarChart3 },
  { to: '/goals', label: 'Study Goals', icon: Sparkles },
  { to: '/habits', label: 'Habits', icon: Flame },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const settings = useSettings()
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const collapsed = settings.sidebarCollapsed

  return (
    <aside
      className={cn(
        'relative z-20 flex h-full shrink-0 flex-col border-r border-border bg-sidebar/95 transition-[width] duration-300',
        collapsed ? 'w-[86px]' : 'w-[248px]',
      )}
    >
      <div className={cn('flex items-center gap-3 px-5 pt-6', collapsed && 'justify-center px-0')}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <BookOpen className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-none">StudyFlow</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">v1.0.0</p>
          </div>
        ) : null}
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const Icon = item.icon
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-2xl bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
                  {!collapsed ? <span className="relative z-10 truncate">{item.label}</span> : null}
                </>
              )}
            </NavLink>
          )
          return collapsed ? (
            <Tooltip key={item.to} label={item.label}>
              {link}
            </Tooltip>
          ) : (
            link
          )
        })}
      </nav>

      <button
        type="button"
        onClick={toggleSidebar}
        className="mx-3 mb-4 flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        {!collapsed ? 'Collapse' : null}
      </button>
    </aside>
  )
}
