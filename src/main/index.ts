import { app, BrowserWindow } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createOverlayWindow } from './overlay-window'
import { registerIpcHandlers } from './ipc-handlers'
import { initOcrEngine, shutdownOcrEngine } from './ocr/ocr-engine'
import { initOpenCvRuntime } from './ocr/opencv-runtime'
import { initScheduler, addCaptureJob, stopAll } from './capture/capture-scheduler'
import { DEFAULT_REGIONS, CAPTURE_INTERVALS } from './capture/region-config'
import { getUserStore } from './data/user-data-store'
import { DEFAULT_CAPTURE_INTERVAL_MS } from '../shared/constants'
import log from 'electron-log/main'
import { applyAppIcon } from './utils/icon'
import { checkForUpdates } from './update-checker'
import { addAppEvent } from './event-center'
import { setPreferredCaptureWindow } from './capture/screen-capture'

// Windows needs hardware acceleration disabled for transparent windows
if (process.platform === 'win32') {
  app.disableHardwareAcceleration()
}

log.initialize()
log.info('MapleStory HUD starting...')
addAppEvent('info', 'app', 'MapleStory HUD starting')

// CI/diagnostics switch: print app version and exit without opening windows
if (process.argv.includes('--app-version')) {
  console.log(app.getVersion())
  app.exit(0)
}

// Global error handlers
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err)
  void writeCrashReport('uncaughtException', err)
})
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason)
  void writeCrashReport('unhandledRejection', reason)
})

// Single instance lock — prevent duplicate app windows
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  log.info('Another instance is already running, quitting.')
  app.quit()
}

let overlayWindow: BrowserWindow | null = null

app.on('second-instance', () => {
  // If user tries to open a second instance, show the existing window
  if (overlayWindow) {
    overlayWindow.show()
  }
})

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.maplestory.hud')
  applyAppIcon()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Create overlay window
  overlayWindow = createOverlayWindow()

  // Register IPC handlers
  await registerIpcHandlers(overlayWindow)

  // Initialize OCR engine
  try {
    await initOpenCvRuntime()
    await initOcrEngine()
  } catch (err) {
    log.error('Failed to initialize OCR engine:', err)
  }

  // Apply saved capture target
  const store = getUserStore()
  const captureTarget = store.get('captureTarget', { sourceId: '', windowName: '' })
  setPreferredCaptureWindow(captureTarget.sourceId || null, captureTarget.windowName)

  // Ensure default regions exist
  ensureDefaultRegions()

  // Initialize capture scheduler
  initScheduler(overlayWindow)

  // Always register jobs. Jobs stay paused until user starts capture.
  startCaptureJobs()

  log.info('MapleStory HUD ready')
  void checkForUpdates()
    .then((update) => {
      if (update.hasUpdate) {
        log.info(`Update available: v${update.latestVersion}`)
        addAppEvent('info', 'update', `Update available: v${update.latestVersion}`)
      }
    })
    .catch((err) => {
      log.warn('Startup update check failed:', err)
      addAppEvent('warn', 'update', 'Startup update check failed')
    })
})

function ensureDefaultRegions(): void {
  const store = getUserStore()
  let regions = store.get('captureRegions', {})

  // Initialize default regions if store is empty
  if (Object.keys(regions).length === 0) {
    store.set('captureRegions', DEFAULT_REGIONS as unknown as typeof regions)
    regions = store.get('captureRegions', {})
    log.info('Initialized default capture regions')
  }

  // Backfill any new default regions that didn't exist or were missing in older configs
  for (const [id, defaults] of Object.entries(DEFAULT_REGIONS)) {
    if (!(id in regions)) {
      regions[id] = defaults
      store.set(`captureRegions.${id}`, defaults)
      log.info(`Backfilled capture region: ${id}`)
    }
  }

  // Remove legacy/unused regions.
  if ('damage' in regions) {
    delete regions.damage
    store.delete('captureRegions.damage')
    log.info('Removed legacy capture region: damage')
  }

  // [meso disabled] Migration no longer needed — meso capture is disabled
  // const mesoMigrated = store.get('_mesoEnabledMigration' as keyof typeof regions, false)
  // if (!mesoMigrated && regions.meso && !regions.meso.enabled) {
  //   regions.meso.enabled = true
  //   store.set('captureRegions.meso', regions.meso)
  //   log.info('Migration: enabled meso capture region')
  // }
  // if (!mesoMigrated) {
  //   store.set('_mesoEnabledMigration' as keyof typeof regions, true as never)
  // }
}

function startCaptureJobs(): void {
  const store = getUserStore()
  const regions = store.get('captureRegions', {})
  const intervals = store.get('captureIntervals', CAPTURE_INTERVALS as unknown as Record<string, number>)
  const allowedRegionIds = new Set(['hp', 'mp', 'exp', 'mapName', 'meso'])

  for (const [id, region] of Object.entries(regions)) {
    if (!allowedRegionIds.has(id)) continue
    if (region.enabled) {
      const interval = intervals[id] || DEFAULT_CAPTURE_INTERVAL_MS
      addCaptureJob(id, region, interval)
    }
  }
}

app.on('will-quit', async () => {
  stopAll()
  log.info('All capture jobs stopped')
  try {
    await shutdownOcrEngine()
  } catch (err) {
    log.error('Error shutting down OCR engine:', err)
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

async function writeCrashReport(type: string, payload: unknown): Promise<void> {
  try {
    const crashDir = join(app.getPath('userData'), 'crash-reports')
    await mkdir(crashDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filePath = join(crashDir, `crash-${stamp}.json`)
    const data = {
      type,
      at: new Date().toISOString(),
      appVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      payload: payload instanceof Error ? {
        name: payload.name,
        message: payload.message,
        stack: payload.stack
      } : payload
    }
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    log.warn('writeCrashReport failed:', err)
  }
}
