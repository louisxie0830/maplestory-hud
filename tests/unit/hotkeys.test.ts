import { describe, it, expect } from 'vitest'
import { validateHotkeys } from '../../src/main/hotkey-validator'

describe('validateHotkeys', () => {
  it('returns ok when all keys are unique', () => {
    const result = validateHotkeys({
      toggleCapture: 'F7',
      resetStats: 'F8',
      toggleLock: 'F9',
      screenshot: 'F10'
    })
    expect(result.ok).toBe(true)
    expect(result.conflicts).toHaveLength(0)
  })

  it('detects duplicate conflicts', () => {
    const result = validateHotkeys({
      toggleCapture: 'F7',
      resetStats: 'F7',
      toggleLock: 'F9',
      screenshot: 'F10'
    })
    expect(result.ok).toBe(false)
    expect(result.conflicts[0]).toContain('F7')
  })
})
