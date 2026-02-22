import { getUserStore } from './data/user-data-store'
import log from 'electron-log/main'

type TelemetryEventName =
  | 'setup.completed'
  | 'settings.opened'
  | 'capture.toggled'
  | 'capture.auto_paused'
  | 'capture.auto_resumed'
  | 'stats.reset'
  | 'screenshot.taken'
  | 'diagnostics.exported'

interface TelemetryEvent {
  name: TelemetryEventName
  timestamp: number
  props?: Record<string, string | number | boolean>
}

const ALLOWED_EVENTS = new Set<TelemetryEventName>([
  'setup.completed',
  'settings.opened',
  'capture.toggled',
  'capture.auto_paused',
  'capture.auto_resumed',
  'stats.reset',
  'screenshot.taken',
  'diagnostics.exported'
])

function sanitizeProps(
  props: Record<string, unknown> | undefined
): Record<string, string | number | boolean> | undefined {
  if (!props || typeof props !== 'object') return undefined
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function trackTelemetryEvent(name: string, props?: Record<string, unknown>): void {
  if (!ALLOWED_EVENTS.has(name as TelemetryEventName)) {
    log.warn(`telemetry rejected unknown event: ${name}`)
    return
  }

  const event: TelemetryEvent = {
    name: name as TelemetryEventName,
    timestamp: Date.now(),
    props: sanitizeProps(props)
  }

  const store = getUserStore()
  const existing = store.get('telemetry.events', []) as TelemetryEvent[]
  const next = [...existing, event].slice(-1000)
  store.set('telemetry.events', next)
  store.set(`telemetry.counters.${event.name}`, (store.get(`telemetry.counters.${event.name}`, 0) as number) + 1)

  log.info('telemetry:event', event)
}
