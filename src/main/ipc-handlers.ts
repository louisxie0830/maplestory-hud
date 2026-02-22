import { ipcMain, BrowserWindow, screen, shell, dialog, app } from 'electron'
import { writeFile, open, stat, readFile, readdir, copyFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { toggleClickThrough, getClickThroughState } from './overlay-window'
import { showLogWindow } from './log-window'
import { getUserStore, type UserStoreSchema } from './data/user-data-store'
import { loadGameData, getMapInfo, searchMaps, getMonsterInfo, getMonsterInfoBatch, getTrainingSpots, getTrainingSpotsByMapId, getCurrentDataSourceInfo } from './data/game-data-loader'
import { captureRegion, isGameWindowVisible } from './capture/screen-capture'
import { addCaptureJob, removeCaptureJob, pauseAll, resumeAll, isRunning } from './capture/capture-scheduler'
import { preprocessImage, getPreset } from './ocr/preprocessor'
import { recognizeImage } from './ocr/ocr-engine'
import { DEFAULT_OCR_CONFIDENCE, DEFAULT_PREPROCESS_THRESHOLD, DEFAULT_CAPTURE_INTERVAL_MS } from '../shared/constants'
import log from 'electron-log/main'
import { trackTelemetryEvent } from './telemetry'
import { checkForUpdates } from './update-checker'
import { getOcrHealthSummary, resetOcrHealthSummary } from './ocr/health-metrics'
import { unregisterHotkeys } from './hotkey-manager'
import { validateHotkeys } from './hotkey-validator'
import { getRuntimeHealthSnapshot } from './observability'
import { addAppEvent, clearAppEvents, getRecentAppEvents } from './event-center'
import { listReplayDatasets, runReplayDataset } from './ocr/replay-runner'

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
    hotkeys: (v) => typeof v === 'object' && v !== null,
    performance: (v) => typeof v === 'object' && v !== null,
    accessibility: (v) => typeof v === 'object' && v !== null,
    locale: (v) => v === 'zh-TW' || v === 'en',
    dataSource: (v) => typeof v === 'object' && v !== null,
    update: (v) => typeof v === 'object' && v !== null,
    profiles: (v) => typeof v === 'object' && v !== null
  }

  const HOTKEY_PATTERN = /^(Ctrl\+|Alt\+|Shift\+|CommandOrControl\+){0,3}(F\d{1,2}|[A-Z0-9])$/i
  const isSafeHotkey = (key: string): boolean => HOTKEY_PATTERN.test(key.trim())

  const buildProfileSnapshot = (): UserStoreSchema['profiles'][string] => ({
    captureRegions: store.get('captureRegions', {}),
    captureIntervals: store.get('captureIntervals', {}),
    ocr: store.get('ocr', {
      confidenceThreshold: DEFAULT_OCR_CONFIDENCE,
      preprocessInvert: true,
      preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD
    }),
    overlay: store.get('overlay', { opacity: 1, isLocked: true, theme: 'dark' }),
    hotkeys: store.get('hotkeys', {
      toggleCapture: 'F7',
      resetStats: 'F8',
      toggleLock: 'F9',
      screenshot: 'F10'
    }),
    performance: store.get('performance', { mode: 'balanced' }),
    accessibility: store.get('accessibility', { fontScale: 1, highContrast: false }),
    locale: store.get('locale', 'zh-TW'),
    dataSource: store.get('dataSource', { mode: 'bundled', pluginDir: '' })
  })

  ipcMain.handle('settings:update', async (_event, settings: Record<string, unknown>) => {
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
      if (key === 'dataSource') {
        await loadGameData()
      }
    }
    addAppEvent('info', 'settings', 'Settings updated')
    return store.store
  })

  ipcMain.handle('settings:get-key', (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('settings:export', async () => {
    try {
      const now = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultName = `maplestory-hud-settings-${now}.json`
      const { canceled, filePath } = await dialog.showSaveDialog(overlayWindow, {
        defaultPath: defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (canceled || !filePath) return null
      await writeFile(filePath, JSON.stringify(store.store, null, 2), 'utf-8')
      trackTelemetryEvent('settings.exported')
      addAppEvent('info', 'settings', 'Settings exported')
      return filePath
    } catch (err) {
      log.error('settings:export failed', err)
      return null
    }
  })

  ipcMain.handle('settings:import', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(overlayWindow, {
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (canceled || filePaths.length === 0) return null
      const filePath = filePaths[0]
      const raw = await readFile(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<UserStoreSchema>
      if (!parsed || typeof parsed !== 'object') return null
      for (const [key, value] of Object.entries(parsed)) {
        const validate = SETTINGS_VALIDATORS[key]
        if (validate && validate(value)) {
          store.set(key as keyof UserStoreSchema, value as never)
        }
      }
      await loadGameData()
      unregisterHotkeys()
      setupCallbacks.registerHotkeys()
      trackTelemetryEvent('settings.imported')
      addAppEvent('info', 'settings', 'Settings imported')
      return store.store
    } catch (err) {
      log.error('settings:import failed', err)
      return null
    }
  })

  // --- Profiles ---
  ipcMain.handle('profiles:list', () => {
    const profiles = store.get('profiles', {})
    return Object.keys(profiles).sort()
  })

  ipcMain.handle('profiles:save', (_event, name: string) => {
    const normalized = String(name || '').trim()
    if (!normalized) return false
    store.set(`profiles.${normalized}`, buildProfileSnapshot())
    addAppEvent('info', 'profile', `Profile saved: ${normalized}`)
    return true
  })

  ipcMain.handle('profiles:load', async (_event, name: string) => {
    const normalized = String(name || '').trim()
    const profile = store.get(`profiles.${normalized}`) as UserStoreSchema['profiles'][string] | undefined
    if (!profile) return null
    store.set('captureRegions', profile.captureRegions)
    store.set('captureIntervals', profile.captureIntervals)
    store.set('ocr', profile.ocr)
    store.set('overlay', profile.overlay)
    store.set('hotkeys', profile.hotkeys)
    store.set('performance', profile.performance)
    store.set('accessibility', profile.accessibility)
    store.set('locale', profile.locale)
    store.set('dataSource', profile.dataSource)
    await loadGameData()
    unregisterHotkeys()
    setupCallbacks.registerHotkeys()
    addAppEvent('info', 'profile', `Profile loaded: ${normalized}`)
    return store.store
  })

  ipcMain.handle('profiles:delete', (_event, name: string) => {
    const normalized = String(name || '').trim()
    if (!normalized) return false
    const profiles = store.get('profiles', {})
    delete profiles[normalized]
    store.set('profiles', profiles)
    addAppEvent('warn', 'profile', `Profile deleted: ${normalized}`)
    return true
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

  ipcMain.handle('ocr:get-health', () => {
    return getOcrHealthSummary()
  })

  ipcMain.handle('ocr:reset-health', () => {
    resetOcrHealthSummary()
  })

  ipcMain.handle('ocr:replay-list', async () => {
    return await listReplayDatasets()
  })

  ipcMain.handle('ocr:replay-run', async (_event, fileName: string) => {
    const result = await runReplayDataset(fileName)
    if (result) {
      addAppEvent('info', 'ocr', `Replay run: ${result.dataset}`, {
        accuracy: Math.round(result.accuracy * 100)
      })
    }
    return result
  })

  ipcMain.handle('calibration:suggest', () => {
    const health = getOcrHealthSummary()
    const regions = store.get('captureRegions', {})
    const ocr = store.get('ocr', {
      confidenceThreshold: DEFAULT_OCR_CONFIDENCE,
      preprocessInvert: true,
      preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD
    })

    const suggestions = health
      .filter((row) => row.total >= 20 && row.successRate < 0.7)
      .map((row) => {
        const base = regions[row.regionId]
        if (!base) return null
        return {
          regionId: row.regionId,
          reason: `success ${Math.round(row.successRate * 100)}%`,
          region: {
            ...base,
            width: Math.min(10000, Math.round(base.width * 1.08)),
            height: Math.min(10000, Math.round(base.height * 1.08))
          },
          ocr: {
            ...ocr,
            confidenceThreshold: Math.max(0.45, Number(ocr.confidenceThreshold) - 0.05)
          }
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    return suggestions
  })

  ipcMain.handle('calibration:apply-suggestions', (_event, suggestions: Array<{
    regionId: string
    region: { x: number; y: number; width: number; height: number; enabled: boolean }
    ocr: { confidenceThreshold: number; preprocessInvert: boolean; preprocessThreshold: number }
  }>) => {
    for (const suggestion of suggestions) {
      if (!validateRegion(suggestion.region)) continue
      store.set(`captureRegions.${suggestion.regionId}`, suggestion.region)
      store.set('ocr', suggestion.ocr)
    }
    addAppEvent('info', 'ocr', 'Calibration suggestions applied')
    return true
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

  ipcMain.handle('hotkeys:validate', (_event, hotkeys: {
    toggleCapture: string
    resetStats: string
    toggleLock: string
    screenshot: string
  }) => {
    if (!isSafeHotkey(hotkeys.toggleCapture) || !isSafeHotkey(hotkeys.resetStats) || !isSafeHotkey(hotkeys.toggleLock) || !isSafeHotkey(hotkeys.screenshot)) {
      return { ok: false, conflicts: ['Invalid hotkey format'] }
    }
    return validateHotkeys(hotkeys)
  })

  ipcMain.handle('hotkeys:update', (_event, hotkeys: {
    toggleCapture: string
    resetStats: string
    toggleLock: string
    screenshot: string
  }) => {
    if (!isSafeHotkey(hotkeys.toggleCapture) || !isSafeHotkey(hotkeys.resetStats) || !isSafeHotkey(hotkeys.toggleLock) || !isSafeHotkey(hotkeys.screenshot)) {
      return { ok: false, conflicts: ['Invalid hotkey format'] }
    }
    const validated = validateHotkeys(hotkeys)
    if (!validated.ok) return validated
    store.set('hotkeys', hotkeys)
    unregisterHotkeys()
    setupCallbacks.registerHotkeys()
    addAppEvent('info', 'hotkey', 'Hotkeys updated')
    return validated
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

  // --- Diagnostics ---
  ipcMain.handle('diagnostics:export', async () => {
    try {
      const now = new Date()
      const stamp = now.toISOString().replace(/[:.]/g, '-')
      const defaultName = `maplestory-hud-diagnostics-${stamp}.json`
      const { canceled, filePath } = await dialog.showSaveDialog(overlayWindow, {
        defaultPath: defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (canceled || !filePath) return null

      const data = {
        generatedAt: now.toISOString(),
        app: {
          name: app.getName(),
          version: app.getVersion(),
          platform: process.platform,
          arch: process.arch
        },
        telemetry: {
          counters: store.get('telemetry.counters', {}),
          lastEvents: store.get('telemetry.events', []).slice(-50)
        },
        settings: {
          overlay: store.get('overlay', { opacity: 1, isLocked: true, theme: 'dark' }),
          captureIntervals: store.get('captureIntervals', {}),
          ocr: store.get('ocr', {
            confidenceThreshold: DEFAULT_OCR_CONFIDENCE,
            preprocessInvert: true,
            preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD
          }),
          hotkeys: store.get('hotkeys', {
            toggleCapture: 'F7',
            resetStats: 'F8',
            toggleLock: 'F9',
            screenshot: 'F10'
          }),
          performance: store.get('performance', { mode: 'balanced' }),
          accessibility: store.get('accessibility', { fontScale: 1, highContrast: false }),
          locale: store.get('locale', 'zh-TW'),
          dataSource: store.get('dataSource', { mode: 'bundled', pluginDir: '' })
        },
        ocrHealth: getOcrHealthSummary(),
        runtime: getRuntimeHealthSnapshot(),
        events: getRecentAppEvents(100),
        logs: {
          path: log.transports.file.getFile().path
        }
      }

      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      trackTelemetryEvent('diagnostics.exported')
      log.info(`Diagnostics exported: ${filePath}`)
      return filePath
    } catch (err) {
      log.error('diagnostics:export failed:', err)
      return null
    }
  })

  // --- App control ---
  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:check-updates', async () => {
    try {
      const channel = store.get('update.channel', 'stable') as 'stable' | 'beta'
      const result = await checkForUpdates(channel)
      trackTelemetryEvent('update.checked', { hasUpdate: result.hasUpdate })
      addAppEvent('info', 'update', `Checked updates on ${channel}`, { hasUpdate: result.hasUpdate })
      return result
    } catch (err) {
      log.warn('app:check-updates failed', err)
      addAppEvent('error', 'update', 'Update check failed')
      return null
    }
  })

  ipcMain.handle('app:get-update-channel', () => {
    return store.get('update.channel', 'stable')
  })

  ipcMain.handle('app:set-update-channel', (_event, channel: 'stable' | 'beta') => {
    const safe = channel === 'beta' ? 'beta' : 'stable'
    store.set('update.channel', safe)
    addAppEvent('info', 'update', `Update channel set: ${safe}`)
    return safe
  })

  ipcMain.handle('app:get-rollback-target', async () => {
    const channel = store.get('update.channel', 'stable') as 'stable' | 'beta'
    const result = await checkForUpdates(channel)
    if (!result.rollbackVersion || !result.rollbackUrl) return null
    return {
      version: result.rollbackVersion,
      url: result.rollbackUrl
    }
  })

  ipcMain.handle('app:open-rollback-url', async () => {
    const channel = store.get('update.channel', 'stable') as 'stable' | 'beta'
    const result = await checkForUpdates(channel)
    if (!result.rollbackUrl) return false
    await shell.openExternal(result.rollbackUrl)
    return true
  })

  ipcMain.handle('app:get-data-source', () => {
    return getCurrentDataSourceInfo()
  })

  ipcMain.handle('observability:get-runtime', () => {
    return getRuntimeHealthSnapshot()
  })

  ipcMain.handle('events:get-recent', (_event, limit: number = 50) => {
    return getRecentAppEvents(limit)
  })

  ipcMain.handle('events:clear', () => {
    clearAppEvents()
  })

  ipcMain.handle('feedback:export-report', async (_event, note: string = '') => {
    try {
      const now = new Date()
      const stamp = now.toISOString().replace(/[:.]/g, '-')
      const defaultName = `maplestory-hud-feedback-${stamp}.json`
      const { canceled, filePath } = await dialog.showSaveDialog(overlayWindow, {
        defaultPath: defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (canceled || !filePath) return null

      const payload = {
        generatedAt: now.toISOString(),
        note,
        app: {
          version: app.getVersion(),
          platform: process.platform,
          arch: process.arch
        },
        events: getRecentAppEvents(100),
        runtime: getRuntimeHealthSnapshot(),
        ocrHealth: getOcrHealthSummary(),
        settings: buildProfileSnapshot()
      }
      await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
      addAppEvent('info', 'feedback', 'Feedback report exported')
      return filePath
    } catch (err) {
      log.warn('feedback:export-report failed', err)
      return null
    }
  })

  ipcMain.handle('app:export-latest-crash-report', async () => {
    try {
      const crashDir = join(app.getPath('userData'), 'crash-reports')
      await mkdir(crashDir, { recursive: true })
      const files = (await readdir(crashDir))
        .filter((name) => name.endsWith('.json'))
        .sort()
      if (files.length === 0) return null
      const latestName = files[files.length - 1]
      const sourcePath = join(crashDir, latestName)
      const { canceled, filePath } = await dialog.showSaveDialog(overlayWindow, {
        defaultPath: latestName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (canceled || !filePath) return null
      await copyFile(sourcePath, filePath)
      return filePath
    } catch (err) {
      log.warn('app:export-latest-crash-report failed', err)
      return null
    }
  })

  ipcMain.on('app:quit', () => {
    app.quit()
  })

  ipcMain.on('app:open-log-viewer', () => {
    showLogWindow()
  })

  // --- Telemetry ---
  ipcMain.handle('analytics:track', (_event, name: string, props?: Record<string, unknown>) => {
    trackTelemetryEvent(name, props)
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
    trackTelemetryEvent('setup.completed')
    addAppEvent('info', 'setup', 'Setup wizard completed')
    log.info('Setup wizard completed')
    return true
  })

  ipcMain.handle('setup:reset', () => {
    store.set('_setupCompleted', false)
    trackTelemetryEvent('wizard.reset')
    addAppEvent('warn', 'setup', 'Setup wizard reset requested')
    return true
  })

  log.info('IPC handlers registered')
}
