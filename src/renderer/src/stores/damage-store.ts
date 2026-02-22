import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../lib/idb-storage'
import type { DamageEntry } from '../types/ocr-result'

interface DamageState {
  damageLog: DamageEntry[]
  dpm: number
  peakDpm: number
  totalDamage: number
  sessionStart: number | null
  bossHp: number
  estimatedKillTime: number // ms, 0 = disabled

  addDamageEntries: (entries: DamageEntry[]) => void
  resetSession: () => void
  recalculateDpm: () => void
  setBossHp: (hp: number) => void
}

const DPM_WINDOW_MS = 60_000 // 1 minute rolling window
const MAX_LOG_ENTRIES = 5000

/** 管理傷害數值記錄和 DPM 計算 */
export const useDamageStore = create<DamageState>()(
  persist(
    (set, get) => ({
  damageLog: [],
  dpm: 0,
  peakDpm: 0,
  totalDamage: 0,
  sessionStart: null,
  bossHp: 0,
  estimatedKillTime: 0,

  addDamageEntries: (entries) => {
    if (entries.length === 0) return

    const state = get()
    const now = Date.now()
    const sessionStart = state.sessionStart || now

    const newLog = [...state.damageLog, ...entries].slice(-MAX_LOG_ENTRIES)
    const totalDamage = state.totalDamage + entries.reduce((sum, e) => sum + e.value, 0)

    // Calculate rolling DPM — findIndex on sorted log + single reduce pass
    const windowStart = now - DPM_WINDOW_MS
    const winIdx = newLog.findIndex((e) => e.timestamp >= windowStart)
    let windowDamage = 0
    if (winIdx >= 0) {
      for (let i = winIdx; i < newLog.length; i++) windowDamage += newLog[i].value
    }
    const windowSeconds = Math.min(DPM_WINDOW_MS, now - sessionStart) / 1000
    const dpm = windowSeconds > 0 ? Math.round((windowDamage / windowSeconds) * 60) : 0

    const peakDpm = Math.max(state.peakDpm, dpm)
    const estimatedKillTime = dpm > 0 && state.bossHp > 0
      ? (state.bossHp / dpm) * 60 * 1000
      : 0

    set({
      damageLog: newLog,
      dpm,
      peakDpm,
      totalDamage,
      sessionStart,
      estimatedKillTime
    })
  },

  resetSession: () => {
    const bossHp = get().bossHp
    set({
      damageLog: [],
      dpm: 0,
      peakDpm: 0,
      totalDamage: 0,
      sessionStart: null,
      estimatedKillTime: 0,
      bossHp
    })
  },

  recalculateDpm: () => {
    const state = get()
    if (!state.sessionStart) return

    const now = Date.now()
    const windowStart = now - DPM_WINDOW_MS
    const winIdx = state.damageLog.findIndex((e) => e.timestamp >= windowStart)
    let windowDamage = 0
    if (winIdx >= 0) {
      for (let i = winIdx; i < state.damageLog.length; i++) windowDamage += state.damageLog[i].value
    }
    const windowSeconds = Math.min(DPM_WINDOW_MS, now - state.sessionStart) / 1000
    const dpm = windowSeconds > 0 ? Math.round((windowDamage / windowSeconds) * 60) : 0

    const estimatedKillTime = dpm > 0 && state.bossHp > 0
      ? (state.bossHp / dpm) * 60 * 1000
      : 0

    set({ dpm, peakDpm: Math.max(state.peakDpm, dpm), estimatedKillTime })
  },

  setBossHp: (hp) => {
    const state = get()
    const estimatedKillTime = state.dpm > 0 && hp > 0
      ? (hp / state.dpm) * 60 * 1000
      : 0
    set({ bossHp: hp, estimatedKillTime })
  }
}),
    {
      name: 'damage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        bossHp: state.bossHp
      })
    }
  )
)
