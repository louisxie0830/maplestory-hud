import { BrowserWindow, ipcMain, shell } from 'electron'
import { readFileSync } from 'fs'
import { getUserStore } from './data/user-data-store'
import { pauseAll, resumeAll, isRunning } from './capture/capture-scheduler'
import { listSelectableWindows, setPreferredCaptureWindow } from './capture/screen-capture'
import { DEFAULT_OCR_CONFIDENCE, DEFAULT_PREPROCESS_THRESHOLD } from '../shared/constants'
import { getOcrHealthSummary } from './ocr/health-metrics'
import { trackTelemetryEvent } from './telemetry'
import { addAppEvent } from './event-center'
import log from 'electron-log/main'

export async function registerIpcHandlers(
  overlayWindow: BrowserWindow
): Promise<void> {
  const store = getUserStore()

  const SETTINGS_VALIDATORS: Record<string, (v: unknown) => boolean> = {
    captureRegions: (v) => typeof v === 'object' && v !== null,
    captureIntervals: (v) => typeof v === 'object' && v !== null,
    captureTarget: (v) => typeof v === 'object' && v !== null,
    ocr: (v) => typeof v === 'object' && v !== null,
    overlay: (v) => typeof v === 'object' && v !== null,
    performance: (v) => typeof v === 'object' && v !== null,
    accessibility: (v) => typeof v === 'object' && v !== null,
    locale: (v) => typeof v === 'string'
  }

  ipcMain.handle('settings:get', () => ({
    captureRegions: store.get('captureRegions', {}),
    captureIntervals: store.get('captureIntervals', {}),
    captureTarget: store.get('captureTarget', { sourceId: '', windowName: '' }),
    ocr: store.get('ocr', {
      confidenceThreshold: DEFAULT_OCR_CONFIDENCE,
      preprocessInvert: true,
      preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD
    }),
    overlay: store.get('overlay', { opacity: 1, isLocked: false, theme: 'dark' }),
    performance: store.get('performance', { mode: 'balanced' }),
    accessibility: store.get('accessibility', { fontScale: 1, highContrast: false }),
    locale: store.get('locale', 'zh-TW')
  }))

  ipcMain.handle('settings:update', (_event, partial: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(partial || {})) {
      const validate = SETTINGS_VALIDATORS[key]
      if (!validate || !validate(value)) continue
      store.set(key as never, value as never)

      if (key === 'overlay') {
        const overlay = value as { opacity?: number }
        if (typeof overlay.opacity === 'number') {
          overlayWindow.setOpacity(Math.max(0.85, Math.min(1, overlay.opacity)))
          overlayWindow.webContents.send('overlay:opacity-changed', Math.max(0.85, Math.min(1, overlay.opacity)))
        }
      }
    }
    return {
      captureRegions: store.get('captureRegions', {}),
      captureIntervals: store.get('captureIntervals', {}),
      captureTarget: store.get('captureTarget', { sourceId: '', windowName: '' }),
      ocr: store.get('ocr', {
        confidenceThreshold: DEFAULT_OCR_CONFIDENCE,
        preprocessInvert: true,
        preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD
      }),
      overlay: store.get('overlay', { opacity: 1, isLocked: false, theme: 'dark' }),
      performance: store.get('performance', { mode: 'balanced' }),
      accessibility: store.get('accessibility', { fontScale: 1, highContrast: false }),
      locale: store.get('locale', 'zh-TW')
    }
  })

  ipcMain.handle('capture:pause-all', () => {
    pauseAll()
    overlayWindow.webContents.send('capture:toggled', false)
  })

  ipcMain.handle('capture:resume-all', () => {
    resumeAll()
    overlayWindow.webContents.send('capture:toggled', true)
  })

  ipcMain.handle('capture:get-running', () => isRunning())

  ipcMain.handle('setup:list-game-windows', async () => listSelectableWindows())

  ipcMain.handle('setup:get-selected-game-window', () => {
    const target = store.get('captureTarget', { sourceId: '', windowName: '' })
    if (!target.sourceId) return null
    return { sourceId: target.sourceId, windowName: target.windowName }
  })

  ipcMain.handle('setup:select-game-window', async (_event, sourceId: string) => {
    const all = await listSelectableWindows()
    const picked = all.find((w) => w.id === sourceId)
    if (!picked) return null
    store.set('captureTarget', { sourceId: picked.id, windowName: picked.name })
    setPreferredCaptureWindow(picked.id, picked.name)
    return { sourceId: picked.id, windowName: picked.name }
  })

  ipcMain.handle('ocr:get-health', () => getOcrHealthSummary())

  ipcMain.handle('logs:read', (_event, maxLines: number = 500) => {
    try {
      const logPath = log.transports.file.getFile().path
      const content = readFileSync(logPath, 'utf-8')
      const lines = content.split(/\r?\n/)
      return lines.slice(Math.max(0, lines.length - maxLines)).join('\n')
    } catch {
      return ''
    }
  })

  ipcMain.handle('logs:get-path', () => log.transports.file.getFile().path)

  ipcMain.handle('logs:open-folder', async () => {
    const filePath = log.transports.file.getFile().path
    await shell.showItemInFolder(filePath)
  })

  ipcMain.handle('analytics:track', (_event, name: string, props?: Record<string, unknown>) => {
    trackTelemetryEvent(name, props)
  })

  addAppEvent('info', 'app', 'IPC handlers registered')
  log.info('IPC handlers registered')
}
