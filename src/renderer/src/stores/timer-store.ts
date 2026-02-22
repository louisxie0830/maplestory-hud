import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../lib/idb-storage'
import { v4 as uuidv4 } from 'uuid'
import type { TimerConfig, TimerState } from '../types/timer'

interface TimerStoreState {
  timers: TimerState[]
  addTimer: (config: Omit<TimerConfig, 'id'>) => string
  removeTimer: (id: string) => void
  startTimer: (id: string) => void
  resetTimer: (id: string) => void
  tick: () => void
  loadTimers: (configs: TimerConfig[]) => void
}

/** 管理計時器（BOSS、藥水、自訂） */
export const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
  timers: [],

  addTimer: (config) => {
    const id = uuidv4()
    const timer: TimerState = {
      ...config,
      id,
      remainingMs: config.durationMs,
      isRunning: false,
      isExpired: false
    }
    set((state) => ({ timers: [...state.timers, timer] }))
    return id
  },

  removeTimer: (id) => {
    set((state) => ({ timers: state.timers.filter((t) => t.id !== id) }))
  },

  startTimer: (id) => {
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === id
          ? { ...t, isRunning: true, startedAt: Date.now(), isExpired: false }
          : t
      )
    }))
  },

  resetTimer: (id) => {
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === id
          ? { ...t, remainingMs: t.durationMs, isRunning: false, isExpired: false, startedAt: undefined }
          : t
      )
    }))
  },

  tick: () => {
    const { timers } = get()
    const now = Date.now()
    let needsUpdate = false

    const updated = timers.map((t) => {
      if (!t.isRunning || t.isExpired) return t

      const elapsed = t.startedAt ? now - t.startedAt : 0
      const remaining = Math.max(0, t.durationMs - elapsed)
      const isExpired = remaining <= 0

      if (remaining !== t.remainingMs || isExpired !== t.isExpired) {
        needsUpdate = true
      }

      if (isExpired && t.alertSound) {
        // Alert will be triggered by the component
      }

      if (isExpired && t.recurring) {
        return {
          ...t,
          remainingMs: t.durationMs,
          startedAt: now,
          isExpired: false
        }
      }

      return {
        ...t,
        remainingMs: remaining,
        isExpired,
        isRunning: !isExpired
      }
    })

    if (needsUpdate) {
      set({ timers: updated })
    }
  },

  loadTimers: (configs) => {
    const timers: TimerState[] = configs.map((c) => ({
      ...c,
      remainingMs: c.durationMs,
      isRunning: false,
      isExpired: false
    }))
    set({ timers })
  }
}),
    {
      name: 'timers',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        timers: state.timers.map(({ id, name, type, durationMs, recurring, alertSound, bossId }) => ({
          id, name, type, durationMs, recurring, alertSound, bossId
        }))
      }),
      merge: (persisted, current) => {
        const saved = persisted as { timers?: Partial<TimerState>[] } | undefined
        if (!saved?.timers?.length) return current
        return {
          ...current,
          timers: saved.timers.map((t) => ({
            ...t,
            remainingMs: t.durationMs ?? 0,
            isRunning: false,
            isExpired: false
          })) as TimerState[]
        }
      }
    }
  )
)
