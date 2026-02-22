export interface DamageEntry {
  value: number
  timestamp: number
}

/**
 * 從 OCR 文字中解析傷害數字
 * 傷害數字在畫面上以獨立數字呈現
 * 支援格式："12345678"、"1,234,567"、多個數字以空白分隔
 * @param text - OCR 辨識出的文字
 * @returns 傷害數值陣列（包含數值與時間戳記）
 */
export function parseDamage(text: string): DamageEntry[] {
  const now = Date.now()
  const entries: DamageEntry[] = []

  // Find all number patterns (with optional commas)
  const matches = text.match(/\d[\d,]*/g)
  if (!matches) return entries

  for (const match of matches) {
    const cleaned = match.replace(/,/g, '')
    const value = parseInt(cleaned, 10)

    // Filter out unreasonable values
    if (isNaN(value)) continue
    if (value < 1) continue
    if (value > 99_999_999_999) continue // Max reasonable damage

    entries.push({ value, timestamp: now })
  }

  return entries
}

/**
 * 在時間窗口內去除重複的傷害數值
 * 相同數值在 windowMs 內再次出現視為重複
 * @param newEntries - 新的傷害數值
 * @param recentEntries - 近期的傷害記錄
 * @param windowMs - 去重時間窗口（毫秒，預設 1500）
 * @returns 去重後的傷害數值陣列
 */
export function deduplicateDamage(
  newEntries: DamageEntry[],
  recentEntries: DamageEntry[],
  windowMs = 1500
): DamageEntry[] {
  const now = Date.now()
  const recentValues = new Set(
    recentEntries
      .filter((e) => now - e.timestamp < windowMs)
      .map((e) => e.value)
  )

  return newEntries.filter((entry) => !recentValues.has(entry.value))
}

export interface DpmData {
  dpm: number // Damage per minute
  totalDamage: number
  sessionDurationMs: number
  peakDpm: number
}

/**
 * 使用滾動時間窗口計算每分鐘傷害量（DPM）
 * @param damageLog - 傷害記錄陣列
 * @param windowMs - 計算窗口大小（毫秒，預設 60000）
 * @returns DPM 統計資料
 */
export function calculateDpm(
  damageLog: DamageEntry[],
  windowMs = 60_000
): DpmData {
  const now = Date.now()
  const windowStart = now - windowMs
  const sessionStart = damageLog.length > 0 ? damageLog[0].timestamp : now

  const windowEntries = damageLog.filter((e) => e.timestamp >= windowStart)
  const windowDamage = windowEntries.reduce((sum, e) => sum + e.value, 0)
  const totalDamage = damageLog.reduce((sum, e) => sum + e.value, 0)

  const windowSeconds = Math.min(windowMs, now - sessionStart) / 1000
  const dpm = windowSeconds > 0 ? (windowDamage / windowSeconds) * 60 : 0

  return {
    dpm: Math.round(dpm),
    totalDamage,
    sessionDurationMs: now - sessionStart,
    peakDpm: 0 // Tracked externally
  }
}
