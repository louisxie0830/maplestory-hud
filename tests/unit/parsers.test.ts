import { describe, it, expect } from 'vitest'
import { parseExp } from '../../src/main/ocr/parsers/exp-parser'
import { parseMeso } from '../../src/main/ocr/parsers/meso-parser'

describe('parseExp', () => {
  it('parses explicit percent format', () => {
    expect(parseExp('67.42%')).toEqual(expect.objectContaining({ percent: 67.42 }))
  })

  it('parses fallback format when percent sign is missing', () => {
    expect(parseExp('EXP 67.42')).toEqual(expect.objectContaining({ percent: 67.42 }))
  })

  it('parses noisy exp token with tail percentage', () => {
    expect(parseExp('EXP886441845.71%')).toEqual(expect.objectContaining({ percent: 45.71, rawValue: 886441845 }))
  })

  it('extracts raw exp value from bracket format', () => {
    expect(parseExp('EXP8864418[45.71%]')).toEqual(expect.objectContaining({ percent: 45.71, rawValue: 8864418 }))
  })

  it('parses spaced percentage format from noisy OCR', () => {
    expect(parseExp('5 31: 886441845 71%')).toEqual(expect.objectContaining({ percent: 45.71 }))
  })

  it('rejects non-exp random integer noise', () => {
    expect(parseExp('1')).toBeNull()
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
