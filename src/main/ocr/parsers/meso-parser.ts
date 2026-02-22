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
  const cleaned = text.replace(/\s+/g, '').replace(/,/g, '')

  // Match digits only
  const match = cleaned.match(/(\d+)/)
  if (!match) return null

  const amount = parseInt(match[1], 10)

  if (isNaN(amount)) return null
  if (amount < 0) return null

  return { amount }
}
