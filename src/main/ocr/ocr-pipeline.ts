import sharp from 'sharp'
import { recognizeImage } from './ocr-engine'
import { preprocessImage, getPreset, type PreprocessOptions } from './preprocessor'
import { parseHpMp, parseHpMpByRegion, parseExp, parseMeso } from './parsers'
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
 * @param regionId - 區域識別碼（如 'hp'、'mp'、'exp'、'meso'）
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

    // Stage 1+2: preprocess + recognize (with fallback variants for key regions)
    const basePreset = getPreset(regionId)
    const presets: PreprocessOptions[] = [basePreset]
    if (regionId === 'hp' || regionId === 'mp' || regionId === 'exp') {
      presets.push(
        { ...basePreset, invert: false, thresholdValue: 160 },
        { ...basePreset, invert: true, thresholdValue: 140 },
        { ...basePreset, invert: false, thresholdValue: 130 }
      )
    }

    let bestText = ''
    let bestConfidence = 0
    let parsed: unknown = null
    let parsedAtLowConfidence = false
    let bestParsedConfidence = -1
    const threshold = getUserStore().get('ocr.confidenceThreshold', DEFAULT_OCR_CONFIDENCE) as number

    for (const preset of presets) {
      const processed = await preprocessImage(rawImageBuffer, preset)
      const ocrResult = await recognizeImage(processed)
      if (ocrResult.confidence > bestConfidence) {
        bestConfidence = ocrResult.confidence
        bestText = ocrResult.text
      }
      const data = parseByRegion(regionId, ocrResult.text)
      if (!data) continue
      if (ocrResult.confidence >= threshold) {
        parsed = data
        bestText = ocrResult.text
        bestConfidence = ocrResult.confidence
        parsedAtLowConfidence = false
        break
      }
      // For simulated image-window OCR, allow parseable numeric outputs at low confidence
      // only when the raw text still matches expected signal shape.
      if (regionId === 'hp' || regionId === 'mp' || regionId === 'exp') {
        const normalizedText = ocrResult.text.replace(/\s+/g, '')
        const shapeOk =
          (regionId === 'hp' || regionId === 'mp')
            ? normalizedText.includes('/')
            : /\d{1,3}[.\s]?\d{0,3}%/.test(ocrResult.text)
        if (!shapeOk) continue
        if (ocrResult.confidence < bestParsedConfidence) continue
        parsed = data
        bestText = ocrResult.text
        bestConfidence = ocrResult.confidence
        bestParsedConfidence = ocrResult.confidence
        parsedAtLowConfidence = true
      }
    }

    if (!parsed) {
      log.debug(
        `OCR ${regionId}: low confidence ${bestConfidence.toFixed(2)} - "${bestText}"`
      )
      return null
    }

    if (parsedAtLowConfidence) {
      log.info(`OCR ${regionId}: accepted low-confidence parsed value from "${bestText}"`)
    }

    return {
      regionId,
      data: parsed,
      confidence: bestConfidence,
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
      return parseHpMpByRegion(text, 'hp') ?? parseHpMp(text)
    case 'mp':
      return parseHpMpByRegion(text, 'mp') ?? parseHpMp(text)
    case 'exp':
      return parseExp(text)
    case 'meso':
      return parseMeso(text)
    default:
      return { text }
  }
}
