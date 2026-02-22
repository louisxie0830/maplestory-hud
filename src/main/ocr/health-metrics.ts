export interface OcrRegionHealth {
  regionId: string
  total: number
  success: number
  failed: number
  successRate: number
  avgLatencyMs: number
  avgConfidence: number
  lastSuccessAt: number | null
  lastFailureAt: number | null
}

interface RegionAccumulator {
  total: number
  success: number
  failed: number
  latencySum: number
  confidenceSum: number
  confidenceCount: number
  lastSuccessAt: number | null
  lastFailureAt: number | null
}

const metrics = new Map<string, RegionAccumulator>()

function getOrCreate(regionId: string): RegionAccumulator {
  const existing = metrics.get(regionId)
  if (existing) return existing
  const created: RegionAccumulator = {
    total: 0,
    success: 0,
    failed: 0,
    latencySum: 0,
    confidenceSum: 0,
    confidenceCount: 0,
    lastSuccessAt: null,
    lastFailureAt: null
  }
  metrics.set(regionId, created)
  return created
}

export function recordOcrAttempt(regionId: string, ok: boolean, latencyMs: number, confidence?: number): void {
  const m = getOrCreate(regionId)
  m.total += 1
  m.latencySum += Math.max(0, latencyMs)
  if (ok) {
    m.success += 1
    m.lastSuccessAt = Date.now()
    if (typeof confidence === 'number' && Number.isFinite(confidence)) {
      m.confidenceSum += confidence
      m.confidenceCount += 1
    }
  } else {
    m.failed += 1
    m.lastFailureAt = Date.now()
  }
}

export function getOcrHealthSummary(): OcrRegionHealth[] {
  return [...metrics.entries()].map(([regionId, m]) => ({
    regionId,
    total: m.total,
    success: m.success,
    failed: m.failed,
    successRate: m.total > 0 ? m.success / m.total : 0,
    avgLatencyMs: m.total > 0 ? m.latencySum / m.total : 0,
    avgConfidence: m.confidenceCount > 0 ? m.confidenceSum / m.confidenceCount : 0,
    lastSuccessAt: m.lastSuccessAt,
    lastFailureAt: m.lastFailureAt
  })).sort((a, b) => a.regionId.localeCompare(b.regionId))
}

export function resetOcrHealthSummary(): void {
  metrics.clear()
}
