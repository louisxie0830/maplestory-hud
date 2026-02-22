import { describe, it, expect } from 'vitest'
import { parseSemver, isVersionNewer } from '../../src/main/update-checker'

describe('update checker semver helpers', () => {
  it('parses versions with and without v prefix', () => {
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3])
    expect(parseSemver('2.0.1')).toEqual([2, 0, 1])
  })

  it('detects newer versions correctly', () => {
    expect(isVersionNewer('1.3.0', '1.2.9')).toBe(true)
    expect(isVersionNewer('1.2.9', '1.2.9')).toBe(false)
    expect(isVersionNewer('1.2.8', '1.2.9')).toBe(false)
  })
})
