import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: 'default' | 'success' | 'error' | 'achievement'
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 5200)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (title: string, description?: string): void =>
    useToastStore.getState().push({ title, description, tone: 'success' }),
  error: (title: string, description?: string): void =>
    useToastStore.getState().push({ title, description, tone: 'error' }),
  info: (title: string, description?: string): void => useToastStore.getState().push({ title, description, tone: 'default' }),
  achievement: (title: string, description?: string): void =>
    useToastStore.getState().push({ title, description, tone: 'achievement' }),
}
