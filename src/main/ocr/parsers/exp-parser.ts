export interface ExpResult {
  percent: number // 0.00 - 100.00
  rawValue?: number
}

/**
 * 從 OCR 文字中解析經驗值百分比
 * 支援格式："45.23%"、"45.23 %"、"99.99%"、"0.12%"
 * @param text - OCR 辨識出的文字
 * @returns 解析結果（包含百分比），或 null
 */
export function parseExp(text: string): ExpResult | null {
  const normalized = text.replace(/,/g, '.').replace(/]/g, '%').replace(/[[(]/g, ' ').replace(/[)]/g, '')
  const cleaned = normalized.replace(/\s+/g, '')

  // Prefer a true decimal percentage first: 45.71% or 45 71%
  const spacedPercentMatches = [...normalized.matchAll(/(\d{1,3})\s*[.\s]\s*(\d{1,3})\s*%/g)]
  if (spacedPercentMatches.length > 0) {
    const last = spacedPercentMatches[spacedPercentMatches.length - 1]
    const whole = last[1]
    const frac = last[2].slice(0, 2).padEnd(2, '0')
    const parsed = parseFloat(`${whole}.${frac}`)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      const before = normalized.slice(0, Math.max(0, last.index ?? 0))
      const rawMatches = [...before.matchAll(/(\d{4,})/g)].map((m) => m[1])
      const rawCandidate = rawMatches.length > 0 ? parseInt(rawMatches[rawMatches.length - 1], 10) : NaN
      return {
        percent: Math.round(parsed * 100) / 100,
        rawValue: Number.isNaN(rawCandidate) ? undefined : rawCandidate
      }
    }
  }

  const percentMatches = [...cleaned.matchAll(/(\d+\.?\d*)%/g)]
  let token: string | null = null
  if (percentMatches.length > 0) {
    // Prefer the last percentage token (OCR often prefixes garbage digits).
    token = percentMatches[percentMatches.length - 1][1]
  } else {
    // Fallback only when EXP context exists and OCR dropped the '%' character.
    if (!/exp/i.test(cleaned)) return null
    const decimal = cleaned.match(/(\d{1,3}\.\d{1,3})/)
    token = decimal?.[1] ?? null
  }
  if (!token) return null

  let percent = parseFloat(token)
  let rawValue: number | undefined

  // Normalize oversized OCR token like "886441845.71" => 45.71
  if (percent > 100 && token.includes('.')) {
    const [left, right = ''] = token.split('.')
    if (left.length >= 4) {
      const parsedRaw = parseInt(left, 10)
      if (!isNaN(parsedRaw)) rawValue = parsedRaw
    }
    const tail = left.slice(-2)
    const normalized = `${tail}.${right.slice(0, 2)}`
    const parsed = parseFloat(normalized)
    if (!isNaN(parsed)) percent = parsed
  }

  // Normalize oversized integer token like "88644184571" => 45.71
  if (percent > 100 && !token.includes('.')) {
    const digits = token.replace(/[^\d]/g, '')
    if (digits.length >= 4) {
      const tail4 = digits.slice(-4)
      const normalized = `${tail4.slice(0, 2)}.${tail4.slice(2)}`
      const parsed = parseFloat(normalized)
      if (!isNaN(parsed)) percent = parsed
    }
  }

  // Validate
  if (isNaN(percent)) return null
  if (percent < 0 || percent > 100) return null

  const tokenWithPercent = percentMatches.length > 0 ? percentMatches[percentMatches.length - 1]?.[0] ?? '' : ''
  const context = tokenWithPercent ? cleaned.slice(0, Math.max(0, cleaned.lastIndexOf(tokenWithPercent))) : cleaned
  const rawMatches = [...context.matchAll(/(\d{4,})/g)].map((m) => m[1])
  if (rawMatches.length > 0) {
    const candidate = rawMatches[rawMatches.length - 1]
    const parsedRaw = parseInt(candidate, 10)
    if (!isNaN(parsedRaw)) rawValue = parsedRaw
  }

  return {
    percent: Math.round(percent * 100) / 100,
    rawValue
  }
}

export interface ExpRateData {
  expPerHour: number
  minutesToLevelUp: number
}

export function calculateExpRate(
  history: Array<{ timestamp: number; percent: number }>
): ExpRateData | null {
  if (history.length < 2) return null
  const now = Date.now()
  const fiveMinAgo = now - 5 * 60 * 1000
  const recent = history.filter((h) => h.timestamp >= fiveMinAgo)
  if (recent.length < 2) return null

  const oldest = recent[0]
  const newest = recent[recent.length - 1]
  const timeDiffHours = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60)
  if (timeDiffHours <= 0) return null

  let expGain = newest.percent - oldest.percent
  if (expGain < 0) expGain = (100 - oldest.percent) + newest.percent

  const expPerHour = expGain / timeDiffHours
  const remaining = 100 - newest.percent
  const minutesToLevelUp = expPerHour > 0 ? (remaining / expPerHour) * 60 : Infinity

  return {
    expPerHour: Math.round(expPerHour * 100) / 100,
    minutesToLevelUp: Math.round(minutesToLevelUp)
  }
}
