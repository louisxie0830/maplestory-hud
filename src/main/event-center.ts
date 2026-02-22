export interface AppEvent {
  id: number
  timestamp: number
  level: 'info' | 'warn' | 'error'
  category: string
  message: string
  meta?: Record<string, string | number | boolean>
}

let seq = 0
const events: AppEvent[] = []

export function addAppEvent(
  level: AppEvent['level'],
  category: string,
  message: string,
  meta?: Record<string, string | number | boolean>
): void {
  events.push({
    id: ++seq,
    timestamp: Date.now(),
    level,
    category,
    message,
    meta
  })
  if (events.length > 500) {
    events.splice(0, events.length - 500)
  }
}

export function getRecentAppEvents(limit = 50): AppEvent[] {
  return events.slice(-Math.max(1, Math.min(limit, 500))).reverse()
}

export function clearAppEvents(): void {
  events.length = 0
}
