import Store from 'electron-store'
import { CAPTURE_INTERVALS } from '../capture/region-config'
import { DEFAULT_OCR_CONFIDENCE, DEFAULT_PREPROCESS_THRESHOLD, DEFAULT_OVERLAY_OPACITY } from '../../shared/constants'

export interface UserStoreSchema {
  captureRegions: Record<string, {
    x: number
    y: number
    width: number
    height: number
    enabled: boolean
  }>
  captureIntervals: Record<string, number>
  captureTarget: {
    sourceId: string
    windowName: string
  }
  ocr: {
    confidenceThreshold: number
    preprocessInvert: boolean
    preprocessThreshold: number
  }
  panels: Record<string, {
    x: number
    y: number
    width: number
    height: number
    visible: boolean
    collapsed: boolean
  }>
  timers: Array<{
    id: string
    name: string
    type: string
    durationMs: number
    recurring: boolean
    alertSound: boolean
    bossId?: string
    startedAt?: number
  }>
  overlay: {
    opacity: number
    isLocked: boolean
    theme: string
  }
  hotkeys: {
    toggleCapture: string
    resetStats: string
    toggleLock: string
    screenshot: string
  }
  performance: {
    mode: 'balanced' | 'performance' | 'power-saver'
  }
  accessibility: {
    fontScale: number
    highContrast: boolean
  }
  locale: 'zh-TW' | 'en'
  dataSource: {
    mode: 'bundled' | 'plugin'
    pluginDir: string
  }
  update: {
    channel: 'stable' | 'beta'
  }
  profiles: Record<string, {
    captureRegions: UserStoreSchema['captureRegions']
    captureIntervals: UserStoreSchema['captureIntervals']
    ocr: UserStoreSchema['ocr']
    overlay: UserStoreSchema['overlay']
    hotkeys: UserStoreSchema['hotkeys']
    performance: UserStoreSchema['performance']
    accessibility: UserStoreSchema['accessibility']
    locale: UserStoreSchema['locale']
    dataSource: UserStoreSchema['dataSource']
    captureTarget: UserStoreSchema['captureTarget']
  }>
  _setupCompleted: boolean
}

let store: Store<UserStoreSchema> | null = null

/** 取得使用者設定儲存實例（單例模式，首次呼叫時初始化預設值） */
export function getUserStore(): Store<UserStoreSchema> {
  if (!store) {
    store = new Store<UserStoreSchema>({
      name: 'maplestory-hud-settings',
      defaults: {
        captureRegions: {},
        captureIntervals: { ...CAPTURE_INTERVALS },
        captureTarget: {
          sourceId: '',
          windowName: ''
        },
        ocr: {
          confidenceThreshold: DEFAULT_OCR_CONFIDENCE,
          preprocessInvert: true,
          preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD
        },
        panels: {
          character: { x: 10, y: 10, width: 220, height: 180, visible: true, collapsed: false },
          timers: { x: 10, y: 200, width: 220, height: 250, visible: true, collapsed: false },
          mapinfo: { x: 10, y: 460, width: 220, height: 200, visible: true, collapsed: false },
          damage: { x: 10, y: 670, width: 220, height: 200, visible: true, collapsed: false }
        },
        timers: [],
        overlay: {
          opacity: DEFAULT_OVERLAY_OPACITY,
          isLocked: false,
          theme: 'dark'
        },
        hotkeys: {
          toggleCapture: 'F7',
          resetStats: 'F8',
          toggleLock: 'F9',
          screenshot: 'F10'
        },
        performance: {
          mode: 'balanced'
        },
        accessibility: {
          fontScale: 1,
          highContrast: false
        },
        locale: 'zh-TW',
        dataSource: {
          mode: 'bundled',
          pluginDir: ''
        },
        update: {
          channel: 'stable'
        },
        profiles: {},
        _setupCompleted: false
      }
    })
  }
  return store
}
