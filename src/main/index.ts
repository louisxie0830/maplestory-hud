import { app, BrowserWindow } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createOverlayWindow } from './overlay-window'
import { createTray } from './tray'
import { destroyLogWindow } from './log-window'
import { registerIpcHandlers } from './ipc-handlers'
import { initOcrEngine, shutdownOcrEngine } from './ocr/ocr-engine'
import { initScheduler, addCaptureJob, stopAll } from './capture/capture-scheduler'
import { DEFAULT_REGIONS, CAPTURE_INTERVALS } from './capture/region-config'
import { getUserStore } from './data/user-data-store'
import { registerHotkeys, unregisterHotkeys } from './hotkey-manager'
import { DEFAULT_CAPTURE_INTERVAL_MS } from '../shared/constants'
import log from 'electron-log/main'
import { applyAppIcon } from './utils/icon'
import { checkForUpdates } from './update-checker'

// Windows needs hardware acceleration disabled for transparent windows
if (process.platform === 'win32') {
  app.disableHardwareAcceleration()
}

log.initialize()
log.info('MapleStory HUD starting...')

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

  // Create system tray
  createTray(overlayWindow)

  // Register IPC handlers (loads game data) — pass setup callbacks
  const startCaptureFn = (): void => startCaptureJobs()
  const registerHotkeysFn = (): void => { registerHotkeys(overlayWindow!) }
  await registerIpcHandlers(overlayWindow, {
    startCaptureJobs: startCaptureFn,
    registerHotkeys: registerHotkeysFn
  })

  // Initialize OCR engine
  try {
    await initOcrEngine()
  } catch (err) {
    log.error('Failed to initialize OCR engine:', err)
  }

  // Migration: existing users who already have config should skip the wizard
  // Must run BEFORE ensureDefaultRegions (which would populate empty stores)
  const store = getUserStore()
  const setupDone = store.get('_setupCompleted', false)
  if (!setupDone) {
    const existingRegions = store.get('captureRegions', {})
    if (Object.keys(existingRegions).length > 0) {
      store.set('_setupCompleted', true)
      log.info('Migration: existing config detected, marking setup as completed')
    }
  }

  // Ensure default regions exist (needed for wizard OCR test)
  ensureDefaultRegions()

  // Initialize capture scheduler
  initScheduler(overlayWindow)

  // Only start capture and hotkeys if setup is already completed
  if (store.get('_setupCompleted', false)) {
    startCaptureJobs()
    registerHotkeys(overlayWindow)
  }

  log.info('MapleStory HUD ready')
  void checkForUpdates()
    .then((update) => {
      if (update.hasUpdate) {
        log.info(`Update available: v${update.latestVersion}`)
      }
    })
    .catch((err) => {
      log.warn('Startup update check failed:', err)
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

  // One-time migration: enable meso region if it was disabled by old defaults
  const mesoMigrated = store.get('_mesoEnabledMigration' as keyof typeof regions, false)
  if (!mesoMigrated && regions.meso && !regions.meso.enabled) {
    regions.meso.enabled = true
    store.set('captureRegions.meso', regions.meso)
    log.info('Migration: enabled meso capture region')
  }
  if (!mesoMigrated) {
    store.set('_mesoEnabledMigration' as keyof typeof regions, true as never)
  }
}

function startCaptureJobs(): void {
  const store = getUserStore()
  const regions = store.get('captureRegions', {})
  const intervals = store.get('captureIntervals', CAPTURE_INTERVALS as unknown as Record<string, number>)

  for (const [id, region] of Object.entries(regions)) {
    if (region.enabled) {
      const interval = intervals[id] || DEFAULT_CAPTURE_INTERVAL_MS
      addCaptureJob(id, region, interval)
    }
  }
}

app.on('will-quit', async () => {
  unregisterHotkeys()
  destroyLogWindow()
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
