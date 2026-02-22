export interface CaptureRegion {
  x: number
  y: number
  width: number
  height: number
  enabled: boolean
}

export interface PanelLayout {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  collapsed: boolean
}

export interface OcrSettings {
  confidenceThreshold: number
  preprocessInvert: boolean
  preprocessThreshold: number
}

export interface AppSettings {
  captureRegions: Record<string, CaptureRegion>
  captureIntervals: Record<string, number>
  ocr: OcrSettings
  panels: Record<string, PanelLayout>
  overlay: {
    opacity: number
    isLocked: boolean
    theme?: string
  }
  performance?: {
    mode: 'balanced' | 'performance' | 'power-saver'
  }
  accessibility?: {
    fontScale: number
    highContrast: boolean
  }
  locale?: 'zh-TW' | 'en'
  dataSource?: {
    mode: 'bundled' | 'plugin'
    pluginDir: string
  }
  hotkeys?: {
    toggleCapture: string
    resetStats: string
    toggleLock: string
    screenshot: string
  }
}

export interface CalibrationResult {
  rawImage: string
  processedImage: string
  text: string
  confidence: number
  regionId: string
}
