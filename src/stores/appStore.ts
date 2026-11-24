import { create } from 'zustand'
import { api } from '@/lib/api'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { ACCENTS } from '@shared/defaults'
import type { AppSettings } from '@shared/types'

interface AppState {
  settings: AppSettings
  ready: boolean
  loadError: string | null
  refreshKey: number
  load: () => Promise<void>
  patchSettings: (patch: Partial<AppSettings>) => Promise<void>
  bumpRefresh: () => void
  toggleSidebar: () => void
}

function applyTheme(settings: AppSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  root.dataset.accent = ACCENTS[settings.accent] ? settings.accent : 'lavender'
  root.classList.toggle('reduce-motion', settings.reducedMotion)
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  ready: false,
  loadError: null,
  refreshKey: 0,
  load: async () => {
    try {
      const settings = await api.settings.get()
      applyTheme(settings)
      set({ settings, ready: true, loadError: null })
    } catch (error) {
      set({ ready: true, loadError: error instanceof Error ? error.message : 'Could not load settings' })
    }
  },
  patchSettings: async (patch) => {
    const current = get().settings
    const optimistic: AppSettings = { ...current, ...patch, timer: { ...current.timer, ...(patch.timer ?? {}) } }
    applyTheme(optimistic)
    set({ settings: optimistic })
    try {
      const saved = await api.settings.update(patch)
      applyTheme(saved)
      set({ settings: saved })
    } catch (error) {
      set({ settings: current })
      applyTheme(current)
      throw error
    }
  },
  bumpRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  toggleSidebar: () => {
    void get().patchSettings({ sidebarCollapsed: !get().settings.sidebarCollapsed })
  },
}))

export function useSettings(): AppSettings {
  return useAppStore((state) => state.settings)
}
