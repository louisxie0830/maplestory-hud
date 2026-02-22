import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../lib/idb-storage'
import type { CaptureRegion } from '../types/settings'

interface SettingsState {
  locale: 'zh-TW' | 'en'

  captureRegions: Record<string, CaptureRegion>
  captureIntervals: Record<string, number>
  isCaptureRunning: boolean
  toggleCapture: () => Promise<void>
  setCaptureRunning: (running: boolean) => void
  loadFullSettings: (settings: Record<string, unknown>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      locale: 'zh-TW',

      captureRegions: {},
      captureIntervals: {},
      isCaptureRunning: false,

      toggleCapture: async () => {
        const current = get().isCaptureRunning
        try {
          if (current) {
            await window.electronAPI?.pauseCapture()
          } else {
            await window.electronAPI?.resumeCapture()
          }
          set({ isCaptureRunning: !current })
        } catch {
          // ignore IPC errors
        }
      },

      setCaptureRunning: (running) => set({ isCaptureRunning: running }),

      loadFullSettings: (settings) => {
        const locale = settings.locale === 'en' ? 'en' : 'zh-TW'

        set({
          captureRegions: (settings.captureRegions as Record<string, CaptureRegion>) || {},
          captureIntervals: (settings.captureIntervals as Record<string, number>) || {},
          locale
        })
      }
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        locale: state.locale
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<SettingsState> | undefined
        if (!saved) return current
        return {
          ...current,
          locale: saved.locale ?? current.locale
        }
      }
    }
  )
)
