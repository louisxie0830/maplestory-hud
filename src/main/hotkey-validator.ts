export interface HotkeyConfig {
  toggleCapture: string
  resetStats: string
  toggleLock: string
  screenshot: string
}

export interface HotkeyValidationResult {
  ok: boolean
  conflicts: string[]
}

export function validateHotkeys(config: HotkeyConfig): HotkeyValidationResult {
  const mapping = new Map<string, string[]>()
  for (const [name, key] of Object.entries(config)) {
    const normalized = key.trim().toUpperCase()
    const list = mapping.get(normalized) ?? []
    list.push(name)
    mapping.set(normalized, list)
  }

  const conflicts = [...mapping.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([key, names]) => `${key} -> ${names.join('/')}`)

  return { ok: conflicts.length === 0, conflicts }
}
