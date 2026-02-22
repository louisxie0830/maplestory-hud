export interface HpMpResult {
  current: number
  max: number
}

/**
 * 從 OCR 文字中解析 HP 或 MP 數值
 * 支援格式："12345/67890"、"12,345 / 67,890"、"12345 / 67890"
 * @param text - OCR 辨識出的文字
 * @returns 解析結果（包含目前值與最大值），或 null
 */
export function parseHpMp(text: string): HpMpResult | null {
  // Remove spaces around slash, normalize commas
  const cleaned = text.replace(/\s+/g, ' ').replace(/,/g, '')

  // Match pattern: number / number
  const match = cleaned.match(/(\d+)\s*\/\s*(\d+)/)
  if (!match) return null

  const current = parseInt(match[1], 10)
  const max = parseInt(match[2], 10)

  // Validate
  if (isNaN(current) || isNaN(max)) return null
  if (max <= 0) return null
  if (current < 0 || current > max) return null

  return { current, max }
}

/**
 * 驗證 HP/MP 數值在兩次讀取之間是否變化過大
 * @param newValue - 新讀取的數值
 * @param lastValue - 上一次讀取的數值
 * @param maxDeltaPercent - 最大允許變化比例（預設 0.5）
 * @returns 若變化在合理範圍內回傳 true
 */
export function validateDelta(
  newValue: HpMpResult,
  lastValue: HpMpResult | null,
  maxDeltaPercent = 0.5
): boolean {
  if (!lastValue) return true

  // Max value shouldn't change (unless equip change)
  if (lastValue.max > 0) {
    const maxDelta = Math.abs(newValue.max - lastValue.max) / lastValue.max
    if (maxDelta > maxDeltaPercent) return false
  }

  return true
}
