import { globalShortcut, BrowserWindow, app, screen, desktopCapturer } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { toggleClickThrough } from './overlay-window'
import { pauseAll, resumeAll, isRunning } from './capture/capture-scheduler'
import { getUserStore } from './data/user-data-store'
import { GAME_WINDOW_NAMES } from '../shared/constants'
import log from 'electron-log/main'
import { validateHotkeys, type HotkeyConfig } from './hotkey-validator'

const DEFAULT_HOTKEYS: HotkeyConfig = {
  toggleCapture: 'F7',
  resetStats: 'F8',
  toggleLock: 'F9',
  screenshot: 'F10'
}

let overlayWindow: BrowserWindow | null = null

/** 從使用者設定中取得快捷鍵配置，若無則回傳預設值 */
export function getHotkeys(): HotkeyConfig {
  const store = getUserStore()
  return store.get('hotkeys', DEFAULT_HOTKEYS) as HotkeyConfig
}

/**
 * 註冊全域快捷鍵，包含擷取啟停、重置統計、鎖定切換、螢幕截圖
 * @param window - 覆蓋視窗實例，用於傳送事件至渲染程序
 */
export function registerHotkeys(window: BrowserWindow): void {
  overlayWindow = window
  const hotkeys = getHotkeys()
  const validation = validateHotkeys(hotkeys)
  if (!validation.ok) {
    log.warn(`Hotkey conflicts detected: ${validation.conflicts.join(', ')}`)
  }

  // F7: Toggle capture start/stop
  registerKey(hotkeys.toggleCapture, () => {
    if (isRunning()) {
      pauseAll()
      log.info('Hotkey: capture paused')
      overlayWindow?.webContents.send('capture:toggled', false)
    } else {
      resumeAll()
      log.info('Hotkey: capture resumed')
      overlayWindow?.webContents.send('capture:toggled', true)
    }
  })

  // F8: Reset stats
  registerKey(hotkeys.resetStats, () => {
    log.info('Hotkey: reset stats')
    overlayWindow?.webContents.send('stats:reset')
  })

  // F9: Toggle lock/unlock overlay
  registerKey(hotkeys.toggleLock, () => {
    if (!overlayWindow) return
    const isNowLocked = toggleClickThrough(overlayWindow)
    const mode = isNowLocked ? 'locked' : 'interactive'
    overlayWindow.webContents.send('overlay:mode-changed', mode)
    log.info(`Hotkey: overlay switched to ${mode} mode`)
  })

  // F10: Screenshot overlay to desktop
  registerKey(hotkeys.screenshot, async () => {
    await captureScreenshot()
  })

  log.info(`Hotkeys registered: ${hotkeys.toggleCapture}/${hotkeys.resetStats}/${hotkeys.toggleLock}/${hotkeys.screenshot}`)
}

function registerKey(accelerator: string, callback: () => void): void {
  if (!globalShortcut.register(accelerator, callback)) {
    log.warn(`Failed to register hotkey: ${accelerator}`)
  }
}

async function captureScreenshot(): Promise<void> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size

    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width, height }
    })

    // Find game window
    const gameSource = sources.find(
      (s) => GAME_WINDOW_NAMES.some((n) => s.name.includes(n))
    )

    if (!gameSource) {
      log.warn('Screenshot: game window not found')
      return
    }

    const image = gameSource.thumbnail
    const pngBuffer = image.toPNG()

    const desktopPath = app.getPath('desktop')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filePath = join(desktopPath, `MapleStory-${timestamp}.png`)

    await writeFile(filePath, pngBuffer)
    log.info(`Screenshot saved: ${filePath}`)

    overlayWindow?.webContents.send('screenshot:taken', filePath)
  } catch (err) {
    log.error('Screenshot failed:', err)
  }
}

/** 取消註冊所有全域快捷鍵 */
export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
}

export { validateHotkeys }
