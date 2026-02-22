export interface ExpResult {
  percent: number // 0.00 - 100.00
}

/**
 * 從 OCR 文字中解析經驗值百分比
 * 支援格式："45.23%"、"45.23 %"、"99.99%"、"0.12%"
 * @param text - OCR 辨識出的文字
 * @returns 解析結果（包含百分比），或 null
 */
export function parseExp(text: string): ExpResult | null {
  const cleaned = text.replace(/\s+/g, '').replace(/,/g, '.')

  // Match percentage pattern
  const match = cleaned.match(/(\d+\.?\d*)\s*%/)
  if (!match) return null

  const percent = parseFloat(match[1])

  // Validate
  if (isNaN(percent)) return null
  if (percent < 0 || percent > 100) return null

  return { percent: Math.round(percent * 100) / 100 }
}

export interface ExpRateData {
  expPerHour: number // EXP percentage per hour
  minutesToLevelUp: number // Estimated minutes to next level
}

/**
 * 從歷史讀取記錄計算經驗值獲取速率
 * @param history - 歷史記錄陣列，每筆包含 timestamp（毫秒）與 percent（0-100）
 * @returns 經驗值速率資料（每小時百分比及預估升級分鐘數），或 null
 */
export function calculateExpRate(
  history: Array<{ timestamp: number; percent: number }>
): ExpRateData | null {
  if (history.length < 2) return null

  // Use last 5 minutes of data for rate calculation
  const now = Date.now()
  const fiveMinAgo = now - 5 * 60 * 1000
  const recent = history.filter((h) => h.timestamp >= fiveMinAgo)

  if (recent.length < 2) return null

  const oldest = recent[0]
  const newest = recent[recent.length - 1]
  const timeDiffHours = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60)

  if (timeDiffHours <= 0) return null

  // Handle level-up (percent goes from high to low)
  let expGain = newest.percent - oldest.percent
  if (expGain < 0) {
    // Level up occurred: assume one level up
    expGain = (100 - oldest.percent) + newest.percent
  }

  const expPerHour = expGain / timeDiffHours
  const remaining = 100 - newest.percent
  const minutesToLevelUp = expPerHour > 0 ? (remaining / expPerHour) * 60 : Infinity

  return {
    expPerHour: Math.round(expPerHour * 100) / 100,
    minutesToLevelUp: Math.round(minutesToLevelUp)
  }
}
