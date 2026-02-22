import type { TimerConfig } from '../../../shared/game-data'

export type { TimerConfig } from '../../../shared/game-data'

export interface TimerState extends TimerConfig {
  remainingMs: number
  isRunning: boolean
  isExpired: boolean
}
