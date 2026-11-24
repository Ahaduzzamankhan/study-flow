import { contextBridge, ipcRenderer } from 'electron'

type Listener<T> = (payload: T) => void

const MENU_ACTIONS = ['new-session', 'start-timer', 'open-settings', 'open-dashboard'] as const

const api = {
  platform: process.platform,
  version: process.env.npm_package_version ?? '1.0.0',
  /**
   * Sends a validated request to the main process. The channel allow-list and
   * payload schemas live in the main process, not here.
   */
  invoke: async (channel: string, payload?: unknown): Promise<unknown> => {
    const response = (await ipcRenderer.invoke('studyflow:invoke', channel, payload ?? {})) as
      | { ok: true; data: unknown }
      | { ok: false; error: string }
    if (!response.ok) throw new Error(response.error)
    return response.data
  },
  onMenuAction: (listener: Listener<string>): (() => void) => {
    const handler = (_event: unknown, action: string): void => {
      if ((MENU_ACTIONS as readonly string[]).includes(action)) listener(action)
    }
    ipcRenderer.on('studyflow:menu', handler)
    return () => ipcRenderer.removeListener('studyflow:menu', handler)
  },
  onWindowState: (listener: Listener<{ focused: boolean }>): (() => void) => {
    const handler = (_event: unknown, state: { focused: boolean }): void => listener(state)
    ipcRenderer.on('studyflow:window-state', handler)
    return () => ipcRenderer.removeListener('studyflow:window-state', handler)
  },
}

contextBridge.exposeInMainWorld('studyflow', api)

export type StudyFlowBridge = typeof api
