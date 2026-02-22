import { describe, it, expect } from 'vitest'

describe('smoke test', () => {
  it('project builds successfully', async () => {
    // Verify key modules can be imported without errors
    const { idbStorage } = await import('../../src/renderer/src/lib/idb-storage')
    expect(idbStorage).toBeDefined()
    expect(typeof idbStorage.getItem).toBe('function')
    expect(typeof idbStorage.setItem).toBe('function')
    expect(typeof idbStorage.removeItem).toBe('function')
  })
})
