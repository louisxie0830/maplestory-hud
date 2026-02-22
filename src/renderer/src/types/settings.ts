export interface CaptureRegion {
  x: number
  y: number
  width: number
  height: number
  enabled: boolean
}

export interface OcrSettings {
  confidenceThreshold: number
  preprocessInvert: boolean
  preprocessThreshold: number
}
