import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import { getIconPath } from './utils/icon'

let logWindow: BrowserWindow | null = null
let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
})

/** 建立 Log 檢視器視窗，若已存在則直接顯示並聚焦 */
export function createLogWindow(): void {
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.show()
    logWindow.focus()
    return
  }

  logWindow = new BrowserWindow({
    width: 860,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    title: 'MapleStory HUD — Log 檢視器',
    show: false,
    alwaysOnTop: true,
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Dark title bar on Windows
  logWindow.setBackgroundColor('#0c0c18')

  logWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      logWindow?.hide()
    }
  })

  logWindow.on('closed', () => {
    logWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    logWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/logs.html`)
  } else {
    logWindow.loadFile(join(__dirname, '../renderer/logs.html'))
  }

  logWindow.once('ready-to-show', () => {
    logWindow?.show()
  })

  log.info('Log viewer window created')
}

/** 顯示 Log 檢視器視窗，若尚未建立則自動建立 */
export function showLogWindow(): void {
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.show()
    logWindow.focus()
  } else {
    createLogWindow()
  }
}

/** 銷毀 Log 檢視器視窗並釋放資源 */
export function destroyLogWindow(): void {
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.destroy()
  }
  logWindow = null
}
