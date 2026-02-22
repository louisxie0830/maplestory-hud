import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import { getIconPath } from './utils/icon'

/** 建立一般桌面應用視窗（非系統匣覆蓋層） */
export function createOverlayWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const width = 420
  const height = display.workAreaSize.height
  const x = display.workArea.x + display.workAreaSize.width - 420
  const y = display.workArea.y

  const overlayWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: false,
    frame: true,
    title: 'MapleStory HUD',
    autoHideMenuBar: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: true,
    hasShadow: true,
    icon: getIconPath(),
    focusable: true,
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  overlayWindow.setIgnoreMouseEvents(false)
  overlayWindow.setFocusable(true)

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show()
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  log.info(`Main window created: ${width}x${height} @ (${x},${y})`)
  return overlayWindow
}

