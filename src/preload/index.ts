import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  listGameWindows: () => Promise<Array<{ id: string; name: string; isGameCandidate: boolean }>>
  getSelectedGameWindow: () => Promise<{ sourceId: string; windowName: string } | null>
  selectGameWindow: (sourceId: string) => Promise<{ sourceId: string; windowName: string } | null>

  onOcrResult: (regionId: string, callback: (data: unknown) => void) => () => void

  onOpacityChanged: (callback: (opacity: number) => void) => () => void

  getSettings: () => Promise<Record<string, unknown>>

  pauseCapture: () => Promise<void>
  resumeCapture: () => Promise<void>
  getCaptureRunning: () => Promise<boolean>
  onCaptureAutoPaused: (callback: () => void) => () => void
  onCaptureAutoResumed: (callback: () => void) => () => void
  onCaptureOcrWeak: (callback: (payload: { regionId: string; streak: number }) => void) => () => void
  onCaptureToggled: (callback: (running: boolean) => void) => () => void

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

  readLogs: (maxLines?: number) => Promise<string>
  getLogsPath: () => Promise<string>
  openLogsFolder: () => Promise<void>

  trackEvent: (name: string, props?: Record<string, unknown>) => Promise<void>
}

const api: ElectronAPI = {
  onOcrResult: (regionId, callback) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown): void => { callback(data) }
    ipcRenderer.on(`ocr:${regionId}`, listener)
    return () => ipcRenderer.removeListener(`ocr:${regionId}`, listener)
  },

  onOpacityChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, opacity: number): void => { callback(opacity) }
    ipcRenderer.on('overlay:opacity-changed', listener)
    return () => ipcRenderer.removeListener('overlay:opacity-changed', listener)
  },

  getSettings: () => ipcRenderer.invoke('settings:get'),

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
  onCaptureOcrWeak: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { regionId: string; streak: number }): void => { callback(payload) }
    ipcRenderer.on('capture:ocr-weak', listener)
    return () => ipcRenderer.removeListener('capture:ocr-weak', listener)
  },
  onCaptureToggled: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, running: boolean): void => { callback(running) }
    ipcRenderer.on('capture:toggled', listener)
    return () => ipcRenderer.removeListener('capture:toggled', listener)
  },

  getOcrHealth: () => ipcRenderer.invoke('ocr:get-health'),

  readLogs: (maxLines) => ipcRenderer.invoke('logs:read', maxLines),
  getLogsPath: () => ipcRenderer.invoke('logs:get-path'),
  openLogsFolder: () => ipcRenderer.invoke('logs:open-folder'),

  trackEvent: (name, props) => ipcRenderer.invoke('analytics:track', name, props),

  listGameWindows: () => ipcRenderer.invoke('setup:list-game-windows'),
  getSelectedGameWindow: () => ipcRenderer.invoke('setup:get-selected-game-window'),
  selectGameWindow: (sourceId) => ipcRenderer.invoke('setup:select-game-window', sourceId)
}

contextBridge.exposeInMainWorld('electronAPI', api)
