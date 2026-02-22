export interface HpMpResult {
  current: number
  max: number
}

export interface ExpResult {
  percent: number
}

export interface DamageEntry {
  value: number
  timestamp: number
}

export interface MesoResult {
  amount: number
}

export interface OcrPipelineResult {
  regionId: string
  data: HpMpResult | ExpResult | DamageEntry[] | MesoResult
  confidence: number
  timestamp: number
}
