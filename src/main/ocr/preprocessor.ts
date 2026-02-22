import sharp from 'sharp'
import { DEFAULT_PREPROCESS_THRESHOLD } from '../../shared/constants'

export interface PreprocessOptions {
  /** Upscale target width for better OCR accuracy */
  targetWidth?: number
  /** Invert colors (for white/light text on dark backgrounds) */
  invert?: boolean
  /** Apply binary threshold */
  threshold?: boolean
  /** Threshold value (0-255, default 150) */
  thresholdValue?: number
  /** Apply sharpening */
  sharpen?: boolean
}

const PRESETS: Record<string, PreprocessOptions> = {
  hp: {
    targetWidth: 400,
    invert: true,
    threshold: true,
    thresholdValue: 160,
    sharpen: true
  },
  mp: {
    targetWidth: 400,
    invert: true,
    threshold: true,
    thresholdValue: 160,
    sharpen: true
  },
  exp: {
    targetWidth: 600,
    invert: false,
    threshold: true,
    thresholdValue: 150,
    sharpen: true
  },
  mapName: {
    targetWidth: 400,
    invert: true,
    threshold: true,
    thresholdValue: 160,
    sharpen: true
  },
  meso: {
    targetWidth: 400,
    invert: true,
    threshold: true,
    thresholdValue: 180,
    sharpen: true
  }
}

/**
 * 取得指定區域類型的預處理設定
 * @param regionType - 區域類型（如 'hp'、'mp'、'exp'、'meso'）
 * @returns 對應的預處理選項，若無對應則回傳預設值
 */
export function getPreset(regionType: string): PreprocessOptions {
  return PRESETS[regionType] || PRESETS.hp
}

/**
 * 對圖片進行預處理以提升 OCR 辨識準確度（灰階、放大、反轉、二值化、銳化）
 * @param imageBuffer - 原始圖片的 Buffer
 * @param options - 預處理選項
 * @returns 處理後的 PNG Buffer
 */
export async function preprocessImage(
  imageBuffer: Buffer,
  options: PreprocessOptions
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer).grayscale()

  // Upscale for better OCR accuracy
  if (options.targetWidth) {
    pipeline = pipeline.resize({
      width: options.targetWidth,
      fit: 'inside',
      withoutEnlargement: false
    })
  }

  // Normalize contrast
  pipeline = pipeline.normalize()

  // Invert if light text on dark background
  if (options.invert) {
    pipeline = pipeline.negate()
  }

  // Binary threshold for cleaner text
  if (options.threshold) {
    pipeline = pipeline.threshold(options.thresholdValue ?? DEFAULT_PREPROCESS_THRESHOLD)
  }

  // Sharpen to improve edge definition
  if (options.sharpen) {
    pipeline = pipeline.sharpen({ sigma: 1.5 })
  }

  return pipeline.png().toBuffer()
}
