export interface OcrHealthRow {
  regionId: string
  total: number
  successRate: number
  avgLatencyMs: number
  avgConfidence: number
}

export function classifyOcrHealth(row: OcrHealthRow): 'ok' | 'warn' | 'error' {
  if (row.total < 10) return 'warn'
  if (row.successRate >= 0.9 && row.avgConfidence >= 0.82) return 'ok'
  if (row.successRate >= 0.7 && row.avgConfidence >= 0.65) return 'warn'
  return 'error'
}

export function pickWeakestRegion(rows: OcrHealthRow[]): OcrHealthRow | null {
  if (rows.length === 0) return null
  return [...rows]
    .sort((a, b) => {
      const scoreA = a.successRate * 0.8 + a.avgConfidence * 0.2
      const scoreB = b.successRate * 0.8 + b.avgConfidence * 0.2
      return scoreA - scoreB
    })[0]
}
