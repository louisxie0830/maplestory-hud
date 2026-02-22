import { describe, it, expect } from 'vitest'
import { parseHpMp, parseHpMpByRegion, validateDelta } from '../../src/main/ocr/parsers/hp-mp-parser'
import { calculateExpRate } from '../../src/main/ocr/parsers/exp-parser'

describe('hp/mp parser helpers', () => {
  it('parses hp/mp format and rejects invalid values', () => {
    expect(parseHpMp('12,345 / 67,890')).toEqual({ current: 12345, max: 67890 })
    expect(parseHpMp('900/100')).toBeNull()
  })

  it('repairs common OCR extra-leading-digit noise', () => {
    expect(parseHpMp('. 110482/10546 2')).toEqual({ current: 10482, max: 10546 })
  })

  it('picks mp pair when hp+mp are mixed in one OCR line', () => {
    const text = 'HP 1999/2038 MP 10482/10548'
    expect(parseHpMpByRegion(text, 'hp')).toEqual({ current: 1999, max: 2038 })
    expect(parseHpMpByRegion(text, 'mp')).toEqual({ current: 10482, max: 10548 })
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
