import { create } from 'zustand'

interface ExpHistoryEntry {
  timestamp: number
  percent: number
}

interface MesoHistoryEntry {
  timestamp: number
  amount: number
}

interface CharacterState {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  expPercent: number
  expHistory: ExpHistoryEntry[]
  expPerHour: number
  minutesToLevelUp: number
  expGained10m: number
  expGained60m: number
  expProjected10m: number
  expProjected60m: number
  meso: number
  mesoHistory: MesoHistoryEntry[]
  mesoPerHour: number
  lastUpdate: number

  setHp: (current: number, max: number) => void
  setMp: (current: number, max: number) => void
  setExp: (percent: number) => void
  setMeso: (amount: number) => void
  resetExpHistory: () => void
}

// Keep 60 minutes of EXP history
const MAX_HISTORY_AGE_MS = 60 * 60 * 1000
const MAX_HISTORY_ENTRIES = 1800

/** 管理 HP/MP/EXP/Meso 角色數值和歷史趨勢 */
export const useCharacterStore = create<CharacterState>((set, get) => ({
  hp: 0,
  maxHp: 0,
  mp: 0,
  maxMp: 0,
  expPercent: 0,
  expHistory: [],
  expPerHour: 0,
  minutesToLevelUp: Infinity,
  expGained10m: 0,
  expGained60m: 0,
  expProjected10m: 0,
  expProjected60m: 0,
  meso: 0,
  mesoHistory: [],
  mesoPerHour: 0,
  lastUpdate: 0,

  setHp: (current, max) => {
    set({ hp: current, maxHp: max, lastUpdate: Date.now() })
  },

  setMp: (current, max) => {
    set({ mp: current, maxMp: max, lastUpdate: Date.now() })
  },

  setExp: (percent) => {
    const now = Date.now()
    const state = get()

    // Trim old entries — history is sorted, so findIndex + slice is cheaper than filter
    const cutoff = now - MAX_HISTORY_AGE_MS
    const prev = state.expHistory
    const trimIdx = prev.length > 0 ? prev.findIndex((h) => h.timestamp >= cutoff) : 0
    const trimmed = trimIdx > 0 ? prev.slice(trimIdx) : trimIdx < 0 ? [] : prev
    const history = [...trimmed, { timestamp: now, percent }].slice(-MAX_HISTORY_ENTRIES)

    // Calculate rate from full history
    let expPerHour = 0
    let minutesToLevelUp = Infinity

    if (history.length >= 2) {
      const oldest = history[0]
      const timeDiffHours = (now - oldest.timestamp) / (1000 * 60 * 60)
      if (timeDiffHours > 0) {
        let expGain = percent - oldest.percent
        if (expGain < 0) expGain = 100 - oldest.percent + percent
        expPerHour = expGain / timeDiffHours

        if (expPerHour > 0) {
          const remaining = 100 - percent
          minutesToLevelUp = (remaining / expPerHour) * 60
        }
      }
    }

    // EXP gained in last 10 minutes — binary-ish scan from sorted history
    const cutoff10m = now - 10 * 60 * 1000
    const idx10m = history.findIndex((h) => h.timestamp >= cutoff10m)
    let expGained10m = 0
    if (idx10m >= 0 && history.length - idx10m >= 2) {
      let gain = percent - history[idx10m].percent
      if (gain < 0) gain = 100 - history[idx10m].percent + percent
      expGained10m = gain
    }

    // EXP gained in last 60 minutes (= full history window)
    let expGained60m = 0
    if (history.length >= 2) {
      let gain = percent - history[0].percent
      if (gain < 0) gain = 100 - history[0].percent + percent
      expGained60m = gain
    }

    // Projections based on current rate
    const expProjected10m = expPerHour / 6   // 10 min = 1/6 hour
    const expProjected60m = expPerHour       // 60 min = 1 hour

    set({
      expPercent: percent,
      expHistory: history,
      expPerHour: Math.round(expPerHour * 100) / 100,
      minutesToLevelUp: Math.round(minutesToLevelUp),
      expGained10m: Math.round(expGained10m * 100) / 100,
      expGained60m: Math.round(expGained60m * 100) / 100,
      expProjected10m: Math.round(expProjected10m * 100) / 100,
      expProjected60m: Math.round(expProjected60m * 100) / 100,
      lastUpdate: now
    })
  },

  setMeso: (amount) => {
    const now = Date.now()
    const state = get()

    const cutoff = now - MAX_HISTORY_AGE_MS
    const prev = state.mesoHistory
    const trimIdx = prev.length > 0 ? prev.findIndex((h) => h.timestamp >= cutoff) : 0
    const trimmed = trimIdx > 0 ? prev.slice(trimIdx) : trimIdx < 0 ? [] : prev
    const mesoHistory = [...trimmed, { timestamp: now, amount }].slice(-MAX_HISTORY_ENTRIES)

    let mesoPerHour = 0
    if (mesoHistory.length >= 2) {
      const oldest = mesoHistory[0]
      const timeDiffHours = (now - oldest.timestamp) / (1000 * 60 * 60)
      if (timeDiffHours > 0) {
        const mesoGain = amount - oldest.amount
        if (mesoGain > 0) {
          mesoPerHour = mesoGain / timeDiffHours
        }
      }
    }

    set({
      meso: amount,
      mesoHistory,
      mesoPerHour: Math.round(mesoPerHour),
      lastUpdate: now
    })
  },

  resetExpHistory: () => {
    set({
      expHistory: [],
      expPerHour: 0,
      minutesToLevelUp: Infinity,
      expGained10m: 0,
      expGained60m: 0,
      expProjected10m: 0,
      expProjected60m: 0,
      mesoHistory: [],
      mesoPerHour: 0
    })
  }
}))
