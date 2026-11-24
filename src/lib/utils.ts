import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function initials(name: string, fallback = 'SF'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function minutesToLabel(minutes: number): string {
  if (minutes <= 0) return '0 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function friendlyDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function shortDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function timeOfDay(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function relativeDay(key: string, today: string): string {
  if (key === today) return 'Today'
  const date = new Date(`${key}T00:00:00`)
  const now = new Date(`${today}T00:00:00`)
  const diff = Math.round((date.getTime() - now.getTime()) / 86_400_000)
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  return `in ${diff} days`
}
