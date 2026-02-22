import { ipcMain, BrowserWindow, screen, shell, dialog, app } from 'electron'
import { writeFile, open, stat } from 'fs/promises'
import { toggleClickThrough, getClickThroughState } from './overlay-window'
import { showLogWindow } from './log-window'
import { getUserStore } from './data/user-data-store'
import { loadGameData, getMapInfo, searchMaps, getMonsterInfo, getMonsterInfoBatch, getTrainingSpots, getTrainingSpotsByMapId } from './data/game-data-loader'
import { captureRegion, isGameWindowVisible } from './capture/screen-capture'
import { addCaptureJob, removeCaptureJob, pauseAll, resumeAll, isRunning } from './capture/capture-scheduler'
import { preprocessImage, getPreset } from './ocr/preprocessor'
import { recognizeImage } from './ocr/ocr-engine'
import { DEFAULT_OCR_CONFIDENCE, DEFAULT_PREPROCESS_THRESHOLD, DEFAULT_CAPTURE_INTERVAL_MS } from '../shared/constants'
import log from 'electron-log/main'

interface SetupCallbacks {
  startCaptureJobs: () => void
  registerHotkeys: () => void
}

/**
 * 註冊所有 IPC 處理器，包含覆蓋視窗控制、設定讀寫、擷取管理、OCR、遊戲資料查詢等
 * @param overlayWindow - 主覆蓋視窗實例
 * @param setupCallbacks - 設定精靈完成後需呼叫的回呼函式
 */
export async function registerIpcHandlers(
  overlayWindow: BrowserWindow,
  setupCallbacks: SetupCallbacks
): Promise<void> {
  const store = getUserStore()

  // Load game data
  await loadGameData()

  // --- Overlay control ---
  ipcMain.handle('overlay:toggle-click-through', () => {
    const isLocked = toggleClickThrough(overlayWindow)
    return isLocked
  })

  ipcMain.handle('overlay:set-opacity', (_event, opacity: number) => {
    const clamped = Math.max(0.2, Math.min(1, opacity))
    overlayWindow.webContents.send('overlay:opacity-changed', clamped)
  })

  ipcMain.handle('overlay:get-state', () => {
    return {
      isClickThrough: getClickThroughState(),
      opacity: 1
    }
  })

  // Temporarily enable/disable mouse passthrough (for hover-to-interact)
  ipcMain.handle('overlay:set-mouse-passthrough', (_event, ignore: boolean) => {
    if (ignore) {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true })
      overlayWindow.setFocusable(false)
    } else {
      overlayWindow.setIgnoreMouseEvents(false)
      overlayWindow.setFocusable(true)
    }
  })

  // --- Settings ---
  ipcMain.handle('settings:get', () => {
    return store.store
  })

  /** 設定鍵白名單與對應的型別驗證器，用於過濾不合法的設定更新請求 */
  const SETTINGS_VALIDATORS: Record<string, (v: unknown) => boolean> = {
    panels: (v) => typeof v === 'object' && v !== null,
    overlay: (v) => typeof v === 'object' && v !== null,
    captureRegions: (v) => typeof v === 'object' && v !== null,
    captureIntervals: (v) => typeof v === 'object' && v !== null,
    ocr: (v) => typeof v === 'object' && v !== null,
    timers: (v) => Array.isArray(v),
    hotkeys: (v) => typeof v === 'object' && v !== null
  }

  ipcMain.handle('settings:update', (_event, settings: Record<string, unknown>) => {
    if (!settings || typeof settings !== 'object') return store.store
    for (const [key, value] of Object.entries(settings)) {
      const validate = SETTINGS_VALIDATORS[key]
      if (!validate) {
        log.warn(`settings:update rejected unknown key: ${key}`)
        continue
      }
      if (!validate(value)) {
        log.warn(`settings:update rejected invalid value for key: ${key}`)
        continue
      }
      store.set(key, value)
    }
    return store.store
  })

  ipcMain.handle('settings:get-key', (_event, key: string) => {
    return store.get(key)
  })

  // --- Capture global control ---
  ipcMain.handle('capture:pause-all', () => {
    pauseAll()
  })

  ipcMain.handle('capture:resume-all', () => {
    resumeAll()
  })

  ipcMain.handle('capture:get-running', () => {
    return isRunning()
  })

  // --- Capture regions ---
  ipcMain.handle('capture:get-regions', () => {
    return store.get('captureRegions', {})
  })

  /**
   * 驗證擷取區域物件的結構與數值是否合法
   * @param region - 待驗證的擷取區域物件
   * @returns 是否為合法的擷取區域
   */
  function validateRegion(region: unknown): region is { x: number; y: number; width: number; height: number; enabled: boolean } {
    if (!region || typeof region !== 'object') return false
    const r = region as Record<string, unknown>
    return (
      typeof r.x === 'number' && isFinite(r.x) && r.x >= 0 &&
      typeof r.y === 'number' && isFinite(r.y) && r.y >= 0 &&
      typeof r.width === 'number' && isFinite(r.width) && r.width > 0 && r.width <= 10000 &&
      typeof r.height === 'number' && isFinite(r.height) && r.height > 0 && r.height <= 10000 &&
      typeof r.enabled === 'boolean'
    )
  }

  ipcMain.handle('capture:set-region', (_event, regionId: string, region: unknown) => {
    if (!validateRegion(region)) {
      log.warn(`capture:set-region rejected invalid region for ${regionId}`)
      return
    }
    store.set(`captureRegions.${regionId}`, region)
  })

  // --- Game data ---
  ipcMain.handle('gamedata:map', (_event, mapId: number) => {
    return getMapInfo(mapId)
  })

  ipcMain.handle('gamedata:search-maps', (_event, query: string) => {
    return searchMaps(query)
  })

  ipcMain.handle('gamedata:monster-drops', (_event, monsterId: number) => {
    return getMonsterInfo(monsterId)
  })

  ipcMain.handle('gamedata:monsters-batch', (_event, monsterIds: number[]) => {
    if (!Array.isArray(monsterIds) || monsterIds.length > 50) return []
    return getMonsterInfoBatch(monsterIds)
  })

  ipcMain.handle('gamedata:training-spots', (_event, level: number) => {
    return getTrainingSpots(level)
  })

  ipcMain.handle('gamedata:training-spots-by-map', (_event, mapId: number) => {
    return getTrainingSpotsByMapId(mapId)
  })

  // --- Capture intervals ---
  ipcMain.handle('capture:get-intervals', () => {
    return store.get('captureIntervals', {})
  })

  ipcMain.handle('capture:set-interval', (_event, regionId: string, interval: number) => {
    if (typeof interval !== 'number' || !isFinite(interval) || interval < 50 || interval > 60000) {
      log.warn(`capture:set-interval rejected invalid interval for ${regionId}: ${interval}`)
      return
    }
    store.set(`captureIntervals.${regionId}`, interval)
    const region = store.get(`captureRegions.${regionId}`) as
      | { x: number; y: number; width: number; height: number; enabled: boolean }
      | undefined
    if (region?.enabled) {
      addCaptureJob(regionId, region, interval)
    }
  })

  ipcMain.handle('capture:preview-region', async (_event, regionId: string) => {
    const regions = store.get('captureRegions', {}) as Record<
      string,
      { x: number; y: number; width: number; height: number; enabled: boolean }
    >
    const region = regions[regionId]
    if (!region) return null
    try {
      const result = await captureRegion(region)
      return result ? result.buffer.toString('base64') : null
    } catch (err) {
      log.error(`Preview capture failed for ${regionId}:`, err)
      return null
    }
  })

  ipcMain.handle('capture:update-job', (_event, regionId: string, region: unknown) => {
    if (!validateRegion(region)) {
      log.warn(`capture:update-job rejected invalid region for ${regionId}`)
      return
    }
    store.set(`captureRegions.${regionId}`, region)
    const intervals = store.get('captureIntervals', {}) as Record<string, number>
    if (region.enabled) {
      addCaptureJob(regionId, region, intervals[regionId] || DEFAULT_CAPTURE_INTERVAL_MS)
    } else {
      removeCaptureJob(regionId)
    }
  })

  // --- OCR settings ---
  ipcMain.handle('ocr:get-settings', () => {
    return store.get('ocr', { confidenceThreshold: DEFAULT_OCR_CONFIDENCE, preprocessInvert: true, preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD })
  })

  ipcMain.handle('ocr:update-settings', (_event, settings: Record<string, unknown>) => {
    const current = store.get('ocr') as Record<string, unknown> || {}
    store.set('ocr', { ...current, ...settings })
  })

  ipcMain.handle('ocr:calibrate', async (_event, regionId: string) => {
    const regions = store.get('captureRegions', {}) as Record<
      string,
      { x: number; y: number; width: number; height: number; enabled: boolean }
    >
    const region = regions[regionId]
    if (!region) return null

    try {
      const captureResult = await captureRegion(region)
      if (!captureResult) return null
      const rawBuffer = captureResult.buffer

      const preset = getPreset(regionId)
      const processedBuffer = await preprocessImage(rawBuffer, preset)
      const ocrResult = await recognizeImage(processedBuffer)

      return {
        rawImage: rawBuffer.toString('base64'),
        processedImage: processedBuffer.toString('base64'),
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        regionId
      }
    } catch (err) {
      log.error(`Calibration failed for ${regionId}:`, err)
      return null
    }
  })

  // --- Timers ---
  ipcMain.handle('timer:get-all', () => {
    return store.get('timers', [])
  })

  ipcMain.handle('timer:save', (_event, timers: unknown[]) => {
    store.set('timers', timers)
  })

  // --- Hotkeys ---
  ipcMain.handle('hotkeys:get', () => {
    return store.get('hotkeys', {
      toggleCapture: 'F7',
      resetStats: 'F8',
      toggleLock: 'F9',
      screenshot: 'F10'
    })
  })

  // --- CSV Export ---
  ipcMain.handle('export:csv', async (_event, options: {
    filename: string
    headers: string[]
    rows: string[][]
  }) => {
    const { canceled, filePath } = await dialog.showSaveDialog(overlayWindow, {
      defaultPath: options.filename,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return null

    const escapeCsvField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    }
    const bom = '\uFEFF'
    const csv = bom + [
      options.headers.map(escapeCsvField).join(','),
      ...options.rows.map(r => r.map(escapeCsvField).join(','))
    ].join('\n')
    await writeFile(filePath, csv, 'utf-8')
    log.info(`CSV exported: ${filePath}`)
    return filePath
  })

  // --- Logs ---
  ipcMain.handle('logs:read', async (_event, maxLines: number = 500) => {
    try {
      const logFile = log.transports.file.getFile()
      const filePath = logFile.path

      const fileStats = await stat(filePath)
      const fileSize = fileStats.size
      if (fileSize === 0) return ''

      // Read at most 64KB from the tail — enough for ~500 lines
      const TAIL_BYTES = 65536
      const readStart = Math.max(0, fileSize - TAIL_BYTES)
      const readLength = fileSize - readStart

      const fh = await open(filePath, 'r')
      try {
        const buf = Buffer.alloc(readLength)
        await fh.read(buf, 0, readLength, readStart)
        let content = buf.toString('utf-8')

        // Skip first partial line if we didn't read from the beginning
        if (readStart > 0) {
          const firstNewline = content.indexOf('\n')
          if (firstNewline !== -1) {
            content = content.slice(firstNewline + 1)
          }
        }

        const lines = content.split('\n')
        return lines.slice(-maxLines).join('\n')
      } finally {
        await fh.close()
      }
    } catch (err) {
      log.warn('Failed to read logs:', err)
      return ''
    }
  })

  ipcMain.handle('logs:get-path', () => {
    try {
      return log.transports.file.getFile().path
    } catch (err) {
      log.warn('Failed to get log path:', err)
      return ''
    }
  })

  ipcMain.handle('logs:open-folder', () => {
    try {
      const filePath = log.transports.file.getFile().path
      shell.showItemInFolder(filePath)
    } catch (err) {
      log.warn('Failed to open logs folder:', err)
    }
  })

  // --- App control ---
  ipcMain.on('app:quit', () => {
    app.quit()
  })

  ipcMain.on('app:open-log-viewer', () => {
    showLogWindow()
  })

  // --- Setup wizard ---
  ipcMain.handle('setup:is-completed', () => {
    return store.get('_setupCompleted', false)
  })

  ipcMain.handle('setup:get-screen-info', () => {
    const primaryDisplay = screen.getPrimaryDisplay()
    return { width: primaryDisplay.size.width, height: primaryDisplay.size.height }
  })

  ipcMain.handle('setup:check-game-window', async () => {
    return await isGameWindowVisible()
  })

  ipcMain.handle('setup:complete', () => {
    store.set('_setupCompleted', true)
    setupCallbacks.startCaptureJobs()
    setupCallbacks.registerHotkeys()
    log.info('Setup wizard completed')
    return true
  })

  log.info('IPC handlers registered')
}
