import { describe, it, expect } from 'vitest'
import { parseExp } from '../../src/main/ocr/parsers/exp-parser'
import { parseMeso } from '../../src/main/ocr/parsers/meso-parser'

describe('parseExp', () => {
  it('parses explicit percent format', () => {
    expect(parseExp('67.42%')).toEqual({ percent: 67.42 })
  })

  it('parses fallback format when percent sign is missing', () => {
    expect(parseExp('EXP 67.42')).toEqual({ percent: 67.42 })
  })
})

describe('parseMeso', () => {
  it('uses largest plausible number from noisy OCR text', () => {
    expect(parseMeso('1,234 126,734,567 98')).toEqual({ amount: 126734567 })
  })

  it('returns null when no number exists', () => {
    expect(parseMeso('abc')).toBeNull()
  })
})
