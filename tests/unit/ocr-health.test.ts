import { describe, expect, it } from 'vitest'
import { classifyOcrHealth, pickWeakestRegion } from '../../src/renderer/src/lib/ocr-health'

describe('ocr health helpers', () => {
  it('classifies healthy rows as ok', () => {
    const status = classifyOcrHealth({
      regionId: 'exp',
      total: 100,
      successRate: 0.95,
      avgLatencyMs: 28,
      avgConfidence: 0.9
    })
    expect(status).toBe('ok')
  })

  it('classifies low-sample rows as warn', () => {
    const status = classifyOcrHealth({
      regionId: 'hp',
      total: 3,
      successRate: 1,
      avgLatencyMs: 10,
      avgConfidence: 1
    })
    expect(status).toBe('warn')
  })

  it('picks the weakest row by weighted score', () => {
    const weakest = pickWeakestRegion([
      { regionId: 'hp', total: 120, successRate: 0.94, avgLatencyMs: 28, avgConfidence: 0.87 },
      { regionId: 'mp', total: 120, successRate: 0.72, avgLatencyMs: 30, avgConfidence: 0.68 },
      { regionId: 'exp', total: 120, successRate: 0.84, avgLatencyMs: 31, avgConfidence: 0.78 }
    ])
    expect(weakest?.regionId).toBe('mp')
  })
})
