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
  overlay: {
    opacity: number
    isLocked: boolean
    theme: string
  }
  performance: {
    mode: 'balanced' | 'performance' | 'power-saver'
  }
  accessibility: {
    fontScale: number
    highContrast: boolean
  }
  locale: 'zh-TW' | 'en'
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
        overlay: {
          opacity: DEFAULT_OVERLAY_OPACITY,
          isLocked: false,
          theme: 'dark'
        },
        performance: {
          mode: 'balanced'
        },
        accessibility: {
          fontScale: 1,
          highContrast: false
        },
        locale: 'zh-TW'
      }
    })
  }
  return store
}
