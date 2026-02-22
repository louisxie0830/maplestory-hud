export interface HpMpResult {
  current: number
  max: number
}

function toInt(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ''), 10)
}

function normalizePair(currentRaw: string, maxRaw: string): HpMpResult | null {
  const max = toInt(maxRaw)
  if (isNaN(max) || max <= 0) return null

  const currentParsed = toInt(currentRaw)
  if (!isNaN(currentParsed) && currentParsed >= 0 && currentParsed <= max) {
    return { current: currentParsed, max }
  }

  // OCR often adds an extra leading digit (e.g. 110482/10546 => 10482/10546).
  const currentDigits = currentRaw.replace(/[^\d]/g, '')
  const maxDigits = maxRaw.replace(/[^\d]/g, '')
  if (currentDigits.length <= maxDigits.length) return null
  const maxCut = currentDigits.length - maxDigits.length
  for (let cut = 1; cut <= maxCut; cut += 1) {
    if (currentDigits.length - cut < 1) break
    const repaired = parseInt(currentDigits.slice(cut), 10)
    if (!isNaN(repaired) && repaired >= 0 && repaired <= max) {
      return { current: repaired, max }
    }
  }

  return null
}

function collectPairs(text: string): HpMpResult[] {
  const cleaned = text.replace(/[,，]/g, '').replace(/\s+/g, ' ')
  const pairs: HpMpResult[] = []
  const regex = /(\d{1,10})\s*\/\s*(\d{1,10})/g
  let m: RegExpExecArray | null = regex.exec(cleaned)
  while (m) {
    const normalized = normalizePair(m[1], m[2])
    if (normalized) {
      pairs.push(normalized)
    }
    m = regex.exec(cleaned)
  }
  return pairs
}

/**
 * 從 OCR 文字中解析 HP 或 MP 數值
 * 支援格式："12345/67890"、"12,345 / 67,890"、"12345 / 67890"
 * @param text - OCR 辨識出的文字
 * @returns 解析結果（包含目前值與最大值），或 null
 */
export function parseHpMp(text: string): HpMpResult | null {
  const pairs = collectPairs(text)
  return pairs[0] ?? null
}

/**
 * 依區域挑選 HP/MP 解析結果：
 * - hp 優先取第一組 a/b
 * - mp 優先取第二組 a/b（若同列混到 HP+MP）
 */
export function parseHpMpByRegion(text: string, regionId: 'hp' | 'mp'): HpMpResult | null {
  const pairs = collectPairs(text)
  if (pairs.length === 0) return null
  if (regionId === 'hp') return pairs[0]
  return pairs[1] ?? pairs[0]
}

/**
 * 驗證 HP/MP 上限在兩次讀取間是否合理（避免 OCR 跳值）
 */
export function validateDelta(
  newValue: HpMpResult,
  lastValue: HpMpResult | null,
  maxDeltaPercent = 0.5
): boolean {
  if (!lastValue) return true
  if (lastValue.max > 0) {
    const maxDelta = Math.abs(newValue.max - lastValue.max) / lastValue.max
    if (maxDelta > maxDeltaPercent) return false
  }
  return true
}
