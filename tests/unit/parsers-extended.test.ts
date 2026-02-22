import { describe, it, expect, vi } from 'vitest'
import { parseHpMp, validateDelta } from '../../src/main/ocr/parsers/hp-mp-parser'
import { calculateExpRate } from '../../src/main/ocr/parsers/exp-parser'
import { deduplicateDamage, calculateDpm, parseDamage } from '../../src/main/ocr/parsers/damage-parser'

describe('hp/mp parser helpers', () => {
  it('parses hp/mp format and rejects invalid values', () => {
    expect(parseHpMp('12,345 / 67,890')).toEqual({ current: 12345, max: 67890 })
    expect(parseHpMp('900/100')).toBeNull()
  })

  it('validates reasonable max delta', () => {
    expect(validateDelta({ current: 10, max: 100 }, { current: 8, max: 100 }, 0.5)).toBe(true)
    expect(validateDelta({ current: 10, max: 200 }, { current: 8, max: 100 }, 0.5)).toBe(false)
  })
})

describe('exp rate calculation', () => {
  it('calculates hourly exp and minutes to level up', () => {
    const now = Date.now()
    const history = [
      { timestamp: now - 4 * 60 * 1000, percent: 10 },
      { timestamp: now, percent: 18 }
    ]
    const result = calculateExpRate(history)
    expect(result).not.toBeNull()
    expect(result!.expPerHour).toBeGreaterThan(100)
    expect(result!.minutesToLevelUp).toBeGreaterThan(0)
  })
})

describe('damage parser helpers', () => {
  it('deduplicates recent damage entries', () => {
    const now = Date.now()
    const input = [{ value: 1000, timestamp: now }]
    const recent = [{ value: 1000, timestamp: now - 200 }]
    expect(deduplicateDamage(input, recent, 1500)).toEqual([])
  })

  it('calculates dpm in time window', () => {
    vi.useFakeTimers()
    const base = new Date('2026-01-01T00:00:00.000Z')
    vi.setSystemTime(base)
    const entries = parseDamage('1000 2000').map((d) => ({ ...d, timestamp: base.getTime() - 30_000 }))
    const dpm = calculateDpm(entries, 60_000)
    expect(dpm.totalDamage).toBe(3000)
    expect(dpm.dpm).toBeGreaterThan(0)
    vi.useRealTimers()
  })
})
