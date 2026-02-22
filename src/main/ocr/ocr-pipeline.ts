import sharp from 'sharp'
import { recognizeImage } from './ocr-engine'
import { preprocessImage, getPreset } from './preprocessor'
import { parseHpMp, parseExp, parseDamage, parseMeso } from './parsers'
import { getUserStore } from '../data/user-data-store'
import { DEFAULT_OCR_CONFIDENCE } from '../../shared/constants'
import log from 'electron-log/main'

const MIN_IMAGE_WIDTH = 10
const MIN_IMAGE_HEIGHT = 5

export interface OcrPipelineResult {
  regionId: string
  data: unknown
  confidence: number
  timestamp: number
}

/**
 * 執行完整的 OCR 處理流程：預處理 -> 文字辨識 -> 解析
 * @param regionId - 區域識別碼（如 'hp'、'mp'、'exp'、'damage'、'meso'）
 * @param rawImageBuffer - 原始擷取圖片的 Buffer
 * @returns 解析後的 OCR 結果，或 null（信心度不足或解析失敗時）
 */
export async function runOcrPipeline(
  regionId: string,
  rawImageBuffer: Buffer
): Promise<OcrPipelineResult | null> {
  try {
    // Validate image size before processing
    const metadata = await sharp(rawImageBuffer).metadata()
    if (!metadata.width || !metadata.height ||
        metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
      return null // Skip tiny images that cause Tesseract errors
    }

    // Stage 1: Preprocess
    const preset = getPreset(regionId)
    const processed = await preprocessImage(rawImageBuffer, preset)

    // Stage 2: Recognize
    const ocrResult = await recognizeImage(processed)

    // Check confidence
    const threshold = getUserStore().get('ocr.confidenceThreshold', DEFAULT_OCR_CONFIDENCE) as number
    if (ocrResult.confidence < threshold) {
      log.debug(
        `OCR ${regionId}: low confidence ${ocrResult.confidence.toFixed(2)} - "${ocrResult.text}"`
      )
      return null
    }

    // Stage 3: Parse based on region type
    const data = parseByRegion(regionId, ocrResult.text)
    if (!data) {
      log.debug(`OCR ${regionId}: parse failed for "${ocrResult.text}"`)
      return null
    }

    return {
      regionId,
      data,
      confidence: ocrResult.confidence,
      timestamp: Date.now()
    }
  } catch (error) {
    log.error(`OCR pipeline error for ${regionId}:`, error)
    return null
  }
}

function parseByRegion(regionId: string, text: string): unknown {
  switch (regionId) {
    case 'hp':
    case 'mp':
      return parseHpMp(text)
    case 'exp':
      return parseExp(text)
    case 'damage':
      return parseDamage(text)
    case 'meso':
      return parseMeso(text)
    default:
      return { text }
  }
}
