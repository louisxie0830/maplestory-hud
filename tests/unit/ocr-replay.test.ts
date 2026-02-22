import { describe, it, expect } from 'vitest'
import { parseHpMp, parseExp, parseDamage, parseMeso } from '../../src/main/ocr/parsers'

describe('ocr replay mini-suite', () => {
  it('parses hp/mp', () => {
    const hp = parseHpMp('12,345 / 67,890')
    expect(hp).toEqual({ current: 12345, max: 67890 })
  })

  it('parses exp', () => {
    const exp = parseExp('67.42%')
    expect(exp?.percent).toBe(67.42)
  })

  it('parses damage list', () => {
    const dmg = parseDamage('12345 67890')
    expect(dmg.map((d) => d.value)).toEqual([12345, 67890])
  })

  it('parses meso', () => {
    const meso = parseMeso('Meso 12,345,678')
    expect(meso?.amount).toBe(12345678)
  })
})
