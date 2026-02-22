import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import { getIconPath } from './utils/icon'

let isClickThrough = true

/** 建立全螢幕透明覆蓋視窗，作為 HUD 的主要顯示層 */
export function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  const overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    roundedCorners: false,
    icon: getIconPath(),
    focusable: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  overlayWindow.setAlwaysOnTop(true, 'pop-up-menu')

  // Default: click-through (locked) mode — overlay passes clicks to windows below
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.setFocusable(false)
  isClickThrough = true

  // Prevent the window from being closeable via Alt+F4 etc,
  // but allow it when the app is quitting
  let isQuitting = false

  app.on('before-quit', () => {
    isQuitting = true
  })

  overlayWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      overlayWindow.hide()
    }
  })

  // Show window only after content is ready to avoid flash/blue border
  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show()
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  log.info(`Overlay window created: ${width}x${height}`)
  return overlayWindow
}

/**
 * 切換滑鼠穿透狀態（鎖定/互動模式）
 * @param _window - 覆蓋視窗實例
 * @returns 切換後是否為穿透（鎖定）狀態
 */
export function toggleClickThrough(_window: BrowserWindow): boolean {
  isClickThrough = !isClickThrough
  // Don't change setIgnoreMouseEvents here — HudPanel hover handles passthrough
  return isClickThrough
}

/** 取得目前滑鼠穿透（鎖定）狀態 */
export function getClickThroughState(): boolean {
  return isClickThrough
}
