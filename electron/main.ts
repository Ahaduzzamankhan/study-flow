import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  shell,
  session,
  ipcMain,
  type MenuItemConstructorOptions,
} from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import type { DB } from './database'
import { openDatabase } from './database'
import { getSettings } from './database/repositories'
import { registerIpcHandlers } from './ipc/handlers'
import type { AppInfo } from '../shared/types'

const isDev = !app.isPackaged
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let db: DB | null = null
let isQuitting = false

const dbPath = (): string => join(app.getPath('userData'), 'studyflow.sqlite')

function iconPath(file: 'icon.png' | 'icon.ico'): string {
  const packaged = join(process.resourcesPath, file)
  if (app.isPackaged && existsSync(packaged)) return packaged
  const dev = join(__dirname, '..', '..', 'build', file)
  if (existsSync(dev)) return dev
  return join(process.resourcesPath, 'icon.png')
}

function requireDb(): DB {
  if (!db) throw new Error('The StudyFlow database is not available.')
  return db
}

function trustedOrigins(): string[] {
  const urls = [pathToFileURL(join(__dirname, '..', '..', 'dist', 'index.html')).href]
  if (process.env.VITE_DEV_SERVER_URL) urls.push(process.env.VITE_DEV_SERVER_URL)
  return urls
}

function hasTrustedSender(url: string): boolean {
  if (!url) return false
  return trustedOrigins().some((trusted) => url.startsWith(trusted.replace(/index\.html$/, '')))
}

function appInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    databasePath: dbPath(),
    userDataPath: app.getPath('userData'),
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node ?? '',
    repositoryUrl: 'https://github.com/Ahaduzzamankhan/study-flow',
  }
}

function createWindow(): BrowserWindow {
  const settings = getSettings(requireDb())
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: settings.theme === 'dark' ? '#141327' : '#F7F3FF',
    title: 'StudyFlow',
    icon: iconPath(process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      devTools: isDev,
      spellcheck: true,
    },
  })

  win.once('ready-to-show', () => {
    if (settings.startMinimizedToTray) win.hide()
    else win.show()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!trustedOrigins().some((trusted) => url.startsWith(trusted.replace(/index\.html$/, '')))) {
      event.preventDefault()
      if (url.startsWith('https://')) void shell.openExternal(url)
    }
  })

  win.on('close', (event) => {
    const current = getSettings(requireDb())
    if (!isQuitting && current.closeToTray) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('focus', () => win.webContents.send('studyflow:window-state', { focused: true }))
  win.on('blur', () => win.webContents.send('studyflow:window-state', { focused: false }))
  win.on('closed', () => {
    mainWindow = null
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '..', '..', 'dist', 'index.html'))

  return win
}

function send(action: string): void {
  mainWindow?.webContents.send('studyflow:menu', action)
}

function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New session', accelerator: 'CmdOrCtrl+N', click: () => send('new-session') },
        { label: 'Start timer', accelerator: 'CmdOrCtrl+T', click: () => send('start-timer') },
        { type: 'separator' },
        { role: 'quit', label: 'Quit StudyFlow' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+1', click: () => send('open-dashboard') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => send('open-settings') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'StudyFlow on GitHub',
          click: () => void shell.openExternal('https://github.com/Ahaduzzamankhan/study-flow'),
        },
        {
          label: 'Release notes',
          click: () => void shell.openExternal('https://github.com/Ahaduzzamankhan/study-flow/releases'),
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function buildTray(): void {
  const image = nativeImage.createFromPath(iconPath('icon.png'))
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 }))
  tray.setToolTip('StudyFlow')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open StudyFlow',
        click: () => {
          if (!mainWindow) mainWindow = createWindow()
          mainWindow.show()
          mainWindow.focus()
        },
      },
      { label: 'Start timer', click: () => send('start-timer') },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', () => {
    if (!mainWindow) mainWindow = createWindow()
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}

function applyLaunchAtStartup(enabled: boolean): void {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: enabled })
  }
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) mainWindow = createWindow()
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    db = openDatabase(dbPath())
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'X-Content-Type-Options': ['nosniff'],
        },
      })
    })

    ipcMain.on('studyflow:noop', () => undefined)
    registerIpcHandlers({
      db: requireDb(),
      dbPath: dbPath(),
      userDataPath: app.getPath('userData'),
      appInfo,
      reopenDatabase: () => {
        db = openDatabase(dbPath())
      },
      applyLaunchAtStartup,
      setFullScreen: (value: boolean) => mainWindow?.setFullScreen(value),
      hasTrustedSender,
    })

    buildMenu()
    buildTray()
    mainWindow = createWindow()

    const settings = getSettings(requireDb())
    applyLaunchAtStartup(settings.launchAtStartup)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('before-quit', () => {
    isQuitting = true
    try {
      db?.close()
    } catch {
      // The database may already be closed after a restore.
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !tray) app.quit()
  })
}
