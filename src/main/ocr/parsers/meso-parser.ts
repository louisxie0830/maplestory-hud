export interface MesoResult {
  amount: number
}

/**
 * 從 OCR 文字中解析楓幣（Meso）金額
 * 支援格式："1,234,567"、"1234567"、"12,345"
 * @param text - OCR 辨識出的文字
 * @returns 解析結果（包含金額），或 null
 */
export function parseMeso(text: string): MesoResult | null {
  const matches = text.match(/\d[\d,]*/g)
  if (!matches || matches.length === 0) return null

  // Choose the largest plausible number to avoid OCR picking short noisy fragments.
  const amount = Math.max(
    ...matches.map((m) => parseInt(m.replace(/,/g, ''), 10)).filter((n) => Number.isFinite(n))
  )

  if (isNaN(amount)) return null
  if (amount < 0) return null

  return { amount }
}
