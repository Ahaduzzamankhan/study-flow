import { useEffect, useState } from 'react'
import {
  Check,
  DatabaseBackup,
  Download,
  ExternalLink,
  FileJson,
  Info,
  Moon,
  Monitor,
  Palette,
  RefreshCcw,
  Save,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useAppStore, useSettings } from '@/stores/appStore'
import { toast } from '@/stores/toastStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import { Badge, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ACCENTS } from '@shared/defaults'
import { cn } from '@/lib/utils'
import type { TimerSettings } from '@shared/types'

export function SettingsPage() {
  const settings = useSettings()
  const patchSettings = useAppStore((state) => state.patchSettings)
  const bumpRefresh = useAppStore((state) => state.bumpRefresh)
  const { data: info } = useAsync(() => api.app.info(), [])
  const [name, setName] = useState(settings.userName)
  const [confirmClear, setConfirmClear] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => setName(settings.userName), [settings.userName])

  const patchTimer = (patch: Partial<TimerSettings>): void => {
    void patchSettings({ timer: { ...settings.timer, ...patch } })
  }

  const checkUpdates = async (): Promise<void> => {
    setChecking(true)
    try {
      const result = await api.app.checkUpdates()
      setUpdateStatus(
        result.latest === null
          ? 'Could not reach GitHub. You are probably offline — StudyFlow works fine without it.'
          : result.updateAvailable
            ? `Version ${result.latest} is available (you have ${result.current}).`
            : `You are on the latest version (${result.current}).`,
      )
    } catch (error) {
      setUpdateStatus(error instanceof Error ? error.message : 'Update check failed.')
    } finally {
      setChecking(false)
    }
  }

  const runDataAction = async (action: 'csv' | 'json' | 'backup' | 'restore' | 'clear'): Promise<void> => {
    try {
      if (action === 'csv' || action === 'json') {
        const result = await api.data.exportData(action)
        if (!result.canceled) toast.success(`Exported ${action.toUpperCase()}`, result.path)
        return
      }
      if (action === 'backup') {
        const result = await api.data.backup()
        if (!result.canceled) toast.success('Backup created', result.path)
        return
      }
      if (action === 'restore') {
        const result = await api.data.restore()
        if (!result.canceled) {
          toast.success('Backup restored', 'Reloading your data.')
          bumpRefresh()
          setTimeout(() => window.location.reload(), 600)
        }
        return
      }
      const result = await api.data.clear()
      if (result.cleared) {
        toast.success('All data cleared', 'Starting from a clean desk.')
        bumpRefresh()
        setTimeout(() => window.location.reload(), 600)
      }
    } catch (error) {
      toast.error('Action failed', error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Settings" subtitle="Everything stays on this computer." />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Shown on your dashboard greeting.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="settings-name">Your name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => void patchSettings({ userName: name.trim() })}
                  placeholder="Scholar"
                />
              </div>
              <Button variant="outline" onClick={() => void patchSettings({ userName: name.trim() })}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application behaviour</CardTitle>
              <CardDescription>How StudyFlow starts and closes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="Launch at startup"
                description="Open StudyFlow when you sign in to Windows."
                checked={settings.launchAtStartup}
                onChange={(value) => {
                  void api.app.setLaunchAtStartup(value)
                  void patchSettings({ launchAtStartup: value })
                }}
              />
              <Separator />
              <ToggleRow
                title="Start minimised to tray"
                description="Start quietly in the system tray instead of opening a window."
                checked={settings.startMinimizedToTray}
                onChange={(value) => void patchSettings({ startMinimizedToTray: value })}
              />
              <Separator />
              <ToggleRow
                title="Keep running when the window closes"
                description="Closing the window hides it to the tray so your timer keeps running."
                checked={settings.closeToTray}
                onChange={(value) => void patchSettings({ closeToTray: value })}
              />
              <Separator />
              <ToggleRow
                title="Gamification"
                description="Show XP, levels and achievement toasts while you study."
                checked={settings.gamification}
                onChange={(value) => void patchSettings({ gamification: value })}
              />
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">Language</p>
                  <p className="text-xs text-muted-foreground">StudyFlow 1.0 ships in English.</p>
                </div>
                <Select value="en" disabled className="w-32">
                  <option value="en">English</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Light, dark, or follow your system.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                { value: 'light' as const, label: 'Light', icon: Sun },
                { value: 'dark' as const, label: 'Dark', icon: Moon },
                { value: 'system' as const, label: 'System', icon: Monitor },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void patchSettings({ theme: option.value })}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors',
                    settings.theme === option.value ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <option.icon className="h-5 w-5" />
                  <span className="text-sm font-bold">{option.label}</span>
                  {settings.theme === option.value ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Accent colour
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(ACCENTS).map(([key, accent]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void patchSettings({ accent: key })}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors',
                    settings.accent === key ? 'border-primary' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: accent.hue }} />
                  {accent.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Motion and background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="Animated background"
                description="Floating stars and soft gradient movement."
                checked={settings.animatedBackground}
                onChange={(value) => void patchSettings({ animatedBackground: value })}
              />
              <Separator />
              <ToggleRow
                title="Reduce motion"
                description="Turn off transitions and animations across the app."
                checked={settings.reducedMotion}
                onChange={(value) => void patchSettings({ reducedMotion: value })}
              />
              <Separator />
              <ToggleRow
                title="Daily motivation"
                description="Show a rotating study quote on the dashboard."
                checked={settings.quotes}
                onChange={(value) => void patchSettings({ quotes: value })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Durations</CardTitle>
              <CardDescription>Minutes per phase and how often a long break appears.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                id="focus-minutes"
                label="Focus"
                value={settings.timer.focusMinutes}
                min={1}
                max={180}
                onCommit={(value) => patchTimer({ focusMinutes: value, preset: 'custom' })}
              />
              <NumberField
                id="short-break"
                label="Short break"
                value={settings.timer.shortBreakMinutes}
                min={1}
                max={60}
                onCommit={(value) => patchTimer({ shortBreakMinutes: value, preset: 'custom' })}
              />
              <NumberField
                id="long-break"
                label="Long break"
                value={settings.timer.longBreakMinutes}
                min={1}
                max={120}
                onCommit={(value) => patchTimer({ longBreakMinutes: value, preset: 'custom' })}
              />
              <NumberField
                id="interval"
                label="Long break every"
                value={settings.timer.longBreakInterval}
                min={2}
                max={12}
                onCommit={(value) => patchTimer({ longBreakInterval: value, preset: 'custom' })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation and alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="Auto-start breaks"
                description="Roll straight into a break when a focus session ends."
                checked={settings.timer.autoStartBreaks}
                onChange={(value) => patchTimer({ autoStartBreaks: value })}
              />
              <Separator />
              <ToggleRow
                title="Auto-start focus sessions"
                description="Start the next focus block automatically after a break."
                checked={settings.timer.autoStartFocus}
                onChange={(value) => patchTimer({ autoStartFocus: value })}
              />
              <Separator />
              <ToggleRow
                title="Timer sound"
                description="Play a soft chime when a phase ends."
                checked={settings.timer.sound}
                onChange={(value) => patchTimer({ sound: value })}
              />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold">Volume</p>
                    <p className="text-xs text-muted-foreground">{Math.round(settings.timer.volume * 100)}%</p>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.timer.volume * 100)}
                  onChange={(event) => patchTimer({ volume: Number(event.target.value) / 100 })}
                  className="w-48"
                  aria-label="Timer volume"
                />
              </div>
              <Separator />
              <ToggleRow
                title="Desktop notifications"
                description="Session, break, goal and achievement alerts."
                checked={settings.timer.notifications}
                onChange={(value) => patchTimer({ notifications: value })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>Your data belongs to you.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void runDataAction('csv')}>
                <Download className="h-4 w-4" /> Sessions CSV
              </Button>
              <Button variant="outline" onClick={() => void runDataAction('json')}>
                <FileJson className="h-4 w-4" /> Full JSON export
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backup and restore</CardTitle>
              <CardDescription>A backup is a copy of the SQLite database file.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => void runDataAction('backup')}>
                <DatabaseBackup className="h-4 w-4" /> Create backup
              </Button>
              <Button variant="outline" onClick={() => void runDataAction('restore')}>
                <RefreshCcw className="h-4 w-4" /> Restore backup
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Database file</span>
                <code className="max-w-[60%] truncate rounded-lg bg-muted px-2 py-1 text-xs">{info?.databasePath ?? '—'}</code>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">User data folder</span>
                <code className="max-w-[60%] truncate rounded-lg bg-muted px-2 py-1 text-xs">{info?.userDataPath ?? '—'}</code>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>Deleting data cannot be undone. Create a backup first.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-4 w-4" /> Clear all study data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary font-display text-lg font-extrabold text-primary-foreground">
                SF
              </span>
              <div>
                <CardTitle>StudyFlow {info?.version ?? '1.0.0'}</CardTitle>
                <CardDescription>Offline study manager for students.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="primary">Electron {info?.electron || '—'}</Badge>
                <Badge tone="muted">Chromium {info?.chrome ? info.chrome.split('.')[0] : '—'}</Badge>
                <Badge tone="muted">Node {info?.node || '—'}</Badge>
                <Badge tone="outline">{info?.platform ?? '—'}</Badge>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => void api.app.openExternal(info?.repositoryUrl ?? 'https://github.com/Ahaduzzamankhan/study-flow')}>
                  <ExternalLink className="h-4 w-4" /> GitHub repository
                </Button>
                <Button variant="soft" onClick={() => void checkUpdates()} disabled={checking}>
                  <RefreshCcw className={cn('h-4 w-4', checking && 'animate-spin')} /> Check for updates
                </Button>
              </div>
              {updateStatus ? <p className="text-xs text-muted-foreground">{updateStatus}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Credits and licence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui patterns, Framer Motion, Recharts, Zustand and better-sqlite3.</p>
              <p>Released under the MIT licence. See LICENSE for details.</p>
              <p>All study data is stored locally in SQLite. No account, no cloud, no tracking.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all study data?</DialogTitle>
            <DialogDescription>
              Subjects, sessions, tasks, goals, habits, notes and settings will be removed. The app will reload with an empty desk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmClear(false)
                void runDataAction('clear')
              }}
            >
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onCommit,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = Number(draft)
          if (Number.isFinite(parsed)) onCommit(Math.min(max, Math.max(min, Math.round(parsed))))
          else setDraft(String(value))
        }}
      />
    </div>
  )
}
