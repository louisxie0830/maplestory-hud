import { contextBridge, ipcRenderer } from 'electron'
import type { MapData, MonsterData, TrainingSpotData, TimerConfig } from '../shared/game-data'

/** Electron 預載 API — 渲染程序透過 contextBridge 使用的所有 IPC 方法 */
export interface ElectronAPI {
  /** 設定精靈：遊戲視窗選擇 */
  listGameWindows: () => Promise<Array<{ id: string; name: string; isGameCandidate: boolean }>>
  getSelectedGameWindow: () => Promise<{ sourceId: string; windowName: string } | null>
  selectGameWindow: (sourceId: string) => Promise<{ sourceId: string; windowName: string } | null>

  /** OCR 資料串流 — 回傳清理函式 */
  onOcrResult: (regionId: string, callback: (data: unknown) => void) => () => void

  /** 覆蓋層模式變更 */
  onModeChanged: (callback: (mode: 'interactive' | 'locked') => void) => () => void

  /** 覆蓋層控制 */
  toggleClickThrough: () => Promise<boolean>
  setOpacity: (opacity: number) => Promise<void>
  getOverlayState: () => Promise<{ isClickThrough: boolean; opacity: number }>
  setMousePassthrough: (ignore: boolean) => Promise<void>

  /** 設定管理 */
  getSettings: () => Promise<Record<string, unknown>>
  updateSettings: (settings: Record<string, unknown>) => Promise<Record<string, unknown>>
  getSettingsKey: (key: string) => Promise<unknown>
  exportSettings: () => Promise<string | null>
  importSettings: () => Promise<Record<string, unknown> | null>
  listProfiles: () => Promise<string[]>
  saveProfile: (name: string) => Promise<boolean>
  loadProfile: (name: string) => Promise<Record<string, unknown> | null>
  deleteProfile: (name: string) => Promise<boolean>

  /** 擷取全域控制 */
  pauseCapture: () => Promise<void>
  resumeCapture: () => Promise<void>
  getCaptureRunning: () => Promise<boolean>
  onCaptureAutoPaused: (callback: () => void) => () => void
  onCaptureAutoResumed: (callback: () => void) => () => void

  /** 擷取區域 */
  getCaptureRegions: () => Promise<Record<string, unknown>>
  setCaptureRegion: (regionId: string, region: unknown) => Promise<void>

  /** 遊戲資料查詢 */
  getMapInfo: (mapId: number) => Promise<MapData | null>
  searchMaps: (query: string) => Promise<MapData[]>
  getMonsterDrops: (monsterId: number) => Promise<MonsterData | null>
  getMonstersBatch: (monsterIds: number[]) => Promise<(MonsterData | null)[]>
  getTrainingSpots: (level: number) => Promise<TrainingSpotData[]>
  getTrainingSpotsByMapId: (mapId: number) => Promise<TrainingSpotData[]>

  /** 擷取與 OCR 校準 */
  getCaptureIntervals: () => Promise<Record<string, number>>
  setCaptureInterval: (regionId: string, interval: number) => Promise<void>
  previewRegion: (regionId: string) => Promise<string | null>
  updateCaptureJob: (regionId: string, region: unknown) => Promise<void>
  getOcrSettings: () => Promise<{ confidenceThreshold: number; preprocessInvert: boolean; preprocessThreshold: number }>
  updateOcrSettings: (settings: Record<string, unknown>) => Promise<void>
  getOcrHealth: () => Promise<Array<{
    regionId: string
    total: number
    success: number
    failed: number
    successRate: number
    avgLatencyMs: number
    avgConfidence: number
    lastSuccessAt: number | null
    lastFailureAt: number | null
  }>>
  resetOcrHealth: () => Promise<void>
  listOcrReplayDatasets: () => Promise<string[]>
  runOcrReplayDataset: (fileName: string) => Promise<{
    dataset: string
    total: number
    passed: number
    failed: number
    accuracy: number
    failures: Array<{ index: number; regionId: string; text: string; expected: unknown; actual: unknown }>
  } | null>
  getCalibrationSuggestions: () => Promise<Array<{
    regionId: string
    reason: string
    region: { x: number; y: number; width: number; height: number; enabled: boolean }
    ocr: { confidenceThreshold: number; preprocessInvert: boolean; preprocessThreshold: number }
  }>>
  applyCalibrationSuggestions: (suggestions: Array<{
    regionId: string
    region: { x: number; y: number; width: number; height: number; enabled: boolean }
    ocr: { confidenceThreshold: number; preprocessInvert: boolean; preprocessThreshold: number }
  }>) => Promise<boolean>
  calibrateRegion: (regionId: string) => Promise<{
    rawImage: string
    processedImage: string
    text: string
    confidence: number
    regionId: string
  } | null>

  /** 計時器 */
  getTimers: () => Promise<TimerConfig[]>
  saveTimers: (timers: TimerConfig[]) => Promise<void>

  /** 快捷鍵 */
  getHotkeys: () => Promise<{ toggleCapture: string; resetStats: string; toggleLock: string; screenshot: string }>
  validateHotkeys: (hotkeys: { toggleCapture: string; resetStats: string; toggleLock: string; screenshot: string }) => Promise<{ ok: boolean; conflicts: string[] }>
  updateHotkeys: (hotkeys: { toggleCapture: string; resetStats: string; toggleLock: string; screenshot: string }) => Promise<{ ok: boolean; conflicts: string[] }>
  onCaptureToggled: (callback: (running: boolean) => void) => () => void
  onStatsReset: (callback: () => void) => () => void
  onScreenshotTaken: (callback: (filePath: string) => void) => () => void

  /** CSV 匯出 */
  exportCsv: (options: { filename: string; headers: string[]; rows: string[][] }) => Promise<string | null>

  /** 日誌 */
  readLogs: (maxLines?: number) => Promise<string>
  getLogsPath: () => Promise<string>
  openLogsFolder: () => Promise<void>

  /** 產品事件追蹤（本機儲存） */
  trackEvent: (name: string, props?: Record<string, unknown>) => Promise<void>
  exportDiagnostics: () => Promise<string | null>

  /** 應用程式控制 */
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<{
    currentVersion: string
    latestVersion: string
    hasUpdate: boolean
    releaseUrl: string
    publishedAt: string
    installerUrl: string | null
    channel: 'stable' | 'beta'
    rollbackVersion: string | null
    rollbackUrl: string | null
  } | null>
  getUpdateChannel: () => Promise<'stable' | 'beta'>
  setUpdateChannel: (channel: 'stable' | 'beta') => Promise<'stable' | 'beta'>
  getRollbackTarget: () => Promise<{ version: string; url: string } | null>
  openRollbackUrl: () => Promise<boolean>
  exportLatestCrashReport: () => Promise<string | null>
  getDataSourceInfo: () => Promise<{ mode: 'bundled' | 'plugin'; path: string }>
  getRuntimeHealth: () => Promise<{
    timestamp: number
    memoryRssMb: number
    memoryHeapUsedMb: number
    cpuPercentApprox: number
    ocrFpsApprox: number
    ocrTotalSamples: number
  }>
  getRecentEvents: (limit?: number) => Promise<Array<{
    id: number
    timestamp: number
    level: 'info' | 'warn' | 'error'
    category: string
    message: string
    meta?: Record<string, string | number | boolean>
  }>>
  clearEvents: () => Promise<void>
  exportFeedbackReport: (note?: string) => Promise<string | null>
  quitApp: () => void
  openLogViewer: () => void

  /** 設定精靈 */
  isSetupCompleted: () => Promise<boolean>
  getScreenInfo: () => Promise<{ width: number; height: number }>
  checkGameWindow: () => Promise<boolean>
  completeSetup: () => Promise<boolean>
  resetSetup: () => Promise<boolean>

  /** 覆蓋層透明度變更 */
  onOpacityChanged: (callback: (opacity: number) => void) => () => void

  /** 清理監聽器 */
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => void
  removeAllListeners: (channel: string) => void
}

const api: ElectronAPI = {
  // OCR data streams — returns cleanup function
  onOcrResult: (regionId, callback) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown): void => { callback(data) }
    ipcRenderer.on(`ocr:${regionId}`, listener)
    return () => ipcRenderer.removeListener(`ocr:${regionId}`, listener)
  },

  // Overlay mode changes
  onModeChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, mode: string): void => { callback(mode as 'interactive' | 'locked') }
    ipcRenderer.on('overlay:mode-changed', listener)
    return () => ipcRenderer.removeListener('overlay:mode-changed', listener)
  },

  // Overlay control
  toggleClickThrough: () => ipcRenderer.invoke('overlay:toggle-click-through'),
  setOpacity: (opacity) => ipcRenderer.invoke('overlay:set-opacity', opacity),
  getOverlayState: () => ipcRenderer.invoke('overlay:get-state'),
  setMousePassthrough: (ignore) => ipcRenderer.invoke('overlay:set-mouse-passthrough', ignore),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
  getSettingsKey: (key) => ipcRenderer.invoke('settings:get-key', key),
  exportSettings: () => ipcRenderer.invoke('settings:export'),
  importSettings: () => ipcRenderer.invoke('settings:import'),
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  saveProfile: (name) => ipcRenderer.invoke('profiles:save', name),
  loadProfile: (name) => ipcRenderer.invoke('profiles:load', name),
  deleteProfile: (name) => ipcRenderer.invoke('profiles:delete', name),

  // Capture global control
  pauseCapture: () => ipcRenderer.invoke('capture:pause-all'),
  resumeCapture: () => ipcRenderer.invoke('capture:resume-all'),
  getCaptureRunning: () => ipcRenderer.invoke('capture:get-running'),
  onCaptureAutoPaused: (callback) => {
    const listener = (): void => { callback() }
    ipcRenderer.on('capture:auto-paused', listener)
    return () => ipcRenderer.removeListener('capture:auto-paused', listener)
  },
  onCaptureAutoResumed: (callback) => {
    const listener = (): void => { callback() }
    ipcRenderer.on('capture:auto-resumed', listener)
    return () => ipcRenderer.removeListener('capture:auto-resumed', listener)
  },

  // Capture regions
  getCaptureRegions: () => ipcRenderer.invoke('capture:get-regions'),
  setCaptureRegion: (regionId, region) =>
    ipcRenderer.invoke('capture:set-region', regionId, region),

  // Game data
  getMapInfo: (mapId) => ipcRenderer.invoke('gamedata:map', mapId),
  searchMaps: (query) => ipcRenderer.invoke('gamedata:search-maps', query),
  getMonsterDrops: (monsterId) => ipcRenderer.invoke('gamedata:monster-drops', monsterId),
  getMonstersBatch: (monsterIds) => ipcRenderer.invoke('gamedata:monsters-batch', monsterIds),
  getTrainingSpots: (level) => ipcRenderer.invoke('gamedata:training-spots', level),
  getTrainingSpotsByMapId: (mapId) => ipcRenderer.invoke('gamedata:training-spots-by-map', mapId),

  // Capture & OCR calibration
  getCaptureIntervals: () => ipcRenderer.invoke('capture:get-intervals'),
  setCaptureInterval: (regionId, interval) =>
    ipcRenderer.invoke('capture:set-interval', regionId, interval),
  previewRegion: (regionId) => ipcRenderer.invoke('capture:preview-region', regionId),
  updateCaptureJob: (regionId, region) =>
    ipcRenderer.invoke('capture:update-job', regionId, region),
  getOcrSettings: () => ipcRenderer.invoke('ocr:get-settings'),
  updateOcrSettings: (settings) => ipcRenderer.invoke('ocr:update-settings', settings),
  getOcrHealth: () => ipcRenderer.invoke('ocr:get-health'),
  resetOcrHealth: () => ipcRenderer.invoke('ocr:reset-health'),
  listOcrReplayDatasets: () => ipcRenderer.invoke('ocr:replay-list'),
  runOcrReplayDataset: (fileName) => ipcRenderer.invoke('ocr:replay-run', fileName),
  getCalibrationSuggestions: () => ipcRenderer.invoke('calibration:suggest'),
  applyCalibrationSuggestions: (suggestions) => ipcRenderer.invoke('calibration:apply-suggestions', suggestions),
  calibrateRegion: (regionId) => ipcRenderer.invoke('ocr:calibrate', regionId),

  // Timers
  getTimers: () => ipcRenderer.invoke('timer:get-all'),
  saveTimers: (timers) => ipcRenderer.invoke('timer:save', timers),

  // Hotkeys
  getHotkeys: () => ipcRenderer.invoke('hotkeys:get'),
  validateHotkeys: (hotkeys) => ipcRenderer.invoke('hotkeys:validate', hotkeys),
  updateHotkeys: (hotkeys) => ipcRenderer.invoke('hotkeys:update', hotkeys),
  onCaptureToggled: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, running: boolean): void => { callback(running) }
    ipcRenderer.on('capture:toggled', listener)
    return () => ipcRenderer.removeListener('capture:toggled', listener)
  },
  onStatsReset: (callback) => {
    const listener = (): void => { callback() }
    ipcRenderer.on('stats:reset', listener)
    return () => ipcRenderer.removeListener('stats:reset', listener)
  },
  onScreenshotTaken: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, filePath: string): void => { callback(filePath) }
    ipcRenderer.on('screenshot:taken', listener)
    return () => ipcRenderer.removeListener('screenshot:taken', listener)
  },

  // CSV Export
  exportCsv: (options) => ipcRenderer.invoke('export:csv', options),

  // Logs
  readLogs: (maxLines) => ipcRenderer.invoke('logs:read', maxLines),
  getLogsPath: () => ipcRenderer.invoke('logs:get-path'),
  openLogsFolder: () => ipcRenderer.invoke('logs:open-folder'),
  trackEvent: (name, props) => ipcRenderer.invoke('analytics:track', name, props),
  exportDiagnostics: () => ipcRenderer.invoke('diagnostics:export'),

  // App control
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),
  getUpdateChannel: () => ipcRenderer.invoke('app:get-update-channel'),
  setUpdateChannel: (channel) => ipcRenderer.invoke('app:set-update-channel', channel),
  getRollbackTarget: () => ipcRenderer.invoke('app:get-rollback-target'),
  openRollbackUrl: () => ipcRenderer.invoke('app:open-rollback-url'),
  exportLatestCrashReport: () => ipcRenderer.invoke('app:export-latest-crash-report'),
  getDataSourceInfo: () => ipcRenderer.invoke('app:get-data-source'),
  getRuntimeHealth: () => ipcRenderer.invoke('observability:get-runtime'),
  getRecentEvents: (limit) => ipcRenderer.invoke('events:get-recent', limit),
  clearEvents: () => ipcRenderer.invoke('events:clear'),
  exportFeedbackReport: (note) => ipcRenderer.invoke('feedback:export-report', note),
  quitApp: () => ipcRenderer.send('app:quit'),
  openLogViewer: () => ipcRenderer.send('app:open-log-viewer'),

  // Setup wizard
  listGameWindows: () => ipcRenderer.invoke('setup:list-game-windows'),
  getSelectedGameWindow: () => ipcRenderer.invoke('setup:get-selected-game-window'),
  selectGameWindow: (sourceId) => ipcRenderer.invoke('setup:select-game-window', sourceId),
  isSetupCompleted: () => ipcRenderer.invoke('setup:is-completed'),
  getScreenInfo: () => ipcRenderer.invoke('setup:get-screen-info'),
  checkGameWindow: () => ipcRenderer.invoke('setup:check-game-window'),
  completeSetup: () => ipcRenderer.invoke('setup:complete'),
  resetSetup: () => ipcRenderer.invoke('setup:reset'),

  // Overlay opacity changed
  onOpacityChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, opacity: number): void => { callback(opacity) }
    ipcRenderer.on('overlay:opacity-changed', listener)
    return () => ipcRenderer.removeListener('overlay:opacity-changed', listener)
  },

  // Cleanup — remove a specific listener, or all listeners on a channel
  removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
}

contextBridge.exposeInMainWorld('electronAPI', api)
