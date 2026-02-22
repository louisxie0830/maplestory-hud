import { CaptureRegion } from './screen-capture'

export interface CaptureRegionConfig {
  hp: CaptureRegion & { enabled: boolean }
  mp: CaptureRegion & { enabled: boolean }
  exp: CaptureRegion & { enabled: boolean }
  mapName: CaptureRegion & { enabled: boolean }
  meso: CaptureRegion & { enabled: boolean }
}

/** 預設擷取區域（1920x1080 新楓之谷的大約位置，使用者應依解析度自行校準） */
export const DEFAULT_REGIONS: CaptureRegionConfig = {
  hp: { x: 235, y: 740, width: 180, height: 16, enabled: true },
  mp: { x: 235, y: 758, width: 180, height: 16, enabled: true },
  exp: { x: 0, y: 1060, width: 1920, height: 12, enabled: true },
  mapName: { x: 5, y: 50, width: 200, height: 20, enabled: false },
  meso: { x: 430, y: 740, width: 130, height: 16, enabled: false /* disabled */ }
}

/** 各區域的擷取間隔時間（毫秒） */
export const CAPTURE_INTERVALS = {
  hp: 300,
  mp: 300,
  exp: 300,
  mapName: 300,
  meso: 300
} as const
