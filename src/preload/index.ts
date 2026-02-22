import { contextBridge, ipcRenderer } from 'electron'
import type { MapData, MonsterData, TrainingSpotData, TimerConfig } from '../shared/game-data'

/** Electron 預載 API — 渲染程序透過 contextBridge 使用的所有 IPC 方法 */
export interface ElectronAPI {
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

  /** 應用程式控制 */
  quitApp: () => void
  openLogViewer: () => void

  /** 設定精靈 */
  isSetupCompleted: () => Promise<boolean>
  getScreenInfo: () => Promise<{ width: number; height: number }>
  checkGameWindow: () => Promise<boolean>
  completeSetup: () => Promise<boolean>

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
  calibrateRegion: (regionId) => ipcRenderer.invoke('ocr:calibrate', regionId),

  // Timers
  getTimers: () => ipcRenderer.invoke('timer:get-all'),
  saveTimers: (timers) => ipcRenderer.invoke('timer:save', timers),

  // Hotkeys
  getHotkeys: () => ipcRenderer.invoke('hotkeys:get'),
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

  // App control
  quitApp: () => ipcRenderer.send('app:quit'),
  openLogViewer: () => ipcRenderer.send('app:open-log-viewer'),

  // Setup wizard
  isSetupCompleted: () => ipcRenderer.invoke('setup:is-completed'),
  getScreenInfo: () => ipcRenderer.invoke('setup:get-screen-info'),
  checkGameWindow: () => ipcRenderer.invoke('setup:check-game-window'),
  completeSetup: () => ipcRenderer.invoke('setup:complete'),

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
