import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Code2,
  FlaskConical,
  Globe2,
  GraduationCap,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  Music,
  Palette,
  PenTool,
  Repeat,
  Sigma,
  Sparkles,
  Star,
  Timer,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  calculator: Calculator,
  flask: FlaskConical,
  atom: Atom,
  globe: Globe2,
  languages: Languages,
  code: Code2,
  laptop: Laptop,
  palette: Palette,
  music: Music,
  brain: Brain,
  sigma: Sigma,
  leaf: Leaf,
  lightbulb: Lightbulb,
  pen: PenTool,
  sparkles: Sparkles,
  star: Star,
  timer: Timer,
  trophy: Trophy,
  graduation: GraduationCap,
  repeat: Repeat,
}

export const ICON_NAMES = Object.keys(ICONS)

export function IconFor({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? BookOpen
  return <Icon className={className} />
}
