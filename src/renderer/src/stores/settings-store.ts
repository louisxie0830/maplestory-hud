import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../lib/idb-storage'
import { DEFAULT_OCR_CONFIDENCE, DEFAULT_PREPROCESS_THRESHOLD, DEFAULT_OVERLAY_OPACITY } from '../../../shared/constants'
import type { CaptureRegion, OcrSettings } from '../types/settings'

type SettingsTab = 'general' | 'capture' | 'calibration' | 'about'

interface HudPanelLayout {
  x: number
  y: number
  width: number
}

interface SectionState {
  collapsed: boolean
}

type Theme = 'dark' | 'light'

interface SettingsState {
  // HUD panel
  hudPanel: HudPanelLayout
  sections: Record<string, SectionState>
  overlayOpacity: number
  theme: Theme
  isLocked: boolean
  isVisible: boolean

  // Capture & OCR
  captureRegions: Record<string, CaptureRegion>
  captureIntervals: Record<string, number>
  ocrSettings: OcrSettings

  // Capture running state
  isCaptureRunning: boolean

  // Settings modal UI
  isSettingsOpen: boolean
  settingsTab: SettingsTab
  isRegionSelectorOpen: boolean

  // HUD actions
  setHudPosition: (x: number, y: number) => void
  toggleSection: (sectionId: string) => void
  setOverlayOpacity: (opacity: number) => void
  setTheme: (theme: Theme) => void
  setLocked: (locked: boolean) => void
  setVisible: (visible: boolean) => void
  resetHudPosition: () => void

  // Capture running actions
  toggleCapture: () => Promise<void>
  setCaptureRunning: (running: boolean) => void

  // Settings modal actions
  openSettings: (tab?: SettingsTab) => void
  closeSettings: () => void
  setSettingsTab: (tab: SettingsTab) => void

  // Capture & OCR actions
  setCaptureRegion: (regionId: string, region: CaptureRegion) => void
  setCaptureInterval: (regionId: string, interval: number) => void
  setOcrSettings: (settings: Partial<OcrSettings>) => void
  openRegionSelector: () => void
  closeRegionSelector: () => void

  // Full settings load
  loadFullSettings: (settings: Record<string, unknown>) => void
}

const DEFAULT_HUD: HudPanelLayout = { x: 10, y: 10, width: 260 }

const DEFAULT_SECTIONS: Record<string, SectionState> = {
  damage: { collapsed: false },
  timers: { collapsed: false },
  map: { collapsed: true }
}

const DEFAULT_OCR: OcrSettings = {
  confidenceThreshold: DEFAULT_OCR_CONFIDENCE,
  preprocessInvert: true,
  preprocessThreshold: DEFAULT_PREPROCESS_THRESHOLD
}

/** 管理 HUD 面板佈局、主題、擷取設定、OCR 設定及 modal 狀態 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
  hudPanel: DEFAULT_HUD,
  sections: DEFAULT_SECTIONS,
  overlayOpacity: DEFAULT_OVERLAY_OPACITY,
  theme: 'dark' as Theme,
  isLocked: true,
  isVisible: true,

  captureRegions: {},
  captureIntervals: {},
  ocrSettings: DEFAULT_OCR,

  isCaptureRunning: true,

  isSettingsOpen: false,
  settingsTab: 'general',
  isRegionSelectorOpen: false,

  setHudPosition: (x, y) => {
    set((state) => ({ hudPanel: { ...state.hudPanel, x, y } }))
  },

  toggleSection: (sectionId) => {
    set((state) => ({
      sections: {
        ...state.sections,
        [sectionId]: {
          collapsed: !(state.sections[sectionId]?.collapsed ?? false)
        }
      }
    }))
  },

  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),

  setTheme: (theme) => {
    set({ theme })
    window.electronAPI?.getSettingsKey('overlay').then((overlay) => {
      const current = (overlay as Record<string, unknown>) || {}
      window.electronAPI?.updateSettings({ overlay: { ...current, theme } })
    }).catch(() => {})
  },

  setLocked: (locked) => set({ isLocked: locked }),
  setVisible: (visible) => set({ isVisible: visible }),

  resetHudPosition: () => {
    set({ hudPanel: DEFAULT_HUD, sections: DEFAULT_SECTIONS })
  },

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
      // IPC failed — don't flip the state
    }
  },
  setCaptureRunning: (running) => set({ isCaptureRunning: running }),

  openSettings: (tab) => set({ isSettingsOpen: true, settingsTab: tab || 'general' }),
  closeSettings: () => set({ isSettingsOpen: false }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),

  setCaptureRegion: (regionId, region) => {
    set((state) => ({
      captureRegions: { ...state.captureRegions, [regionId]: region }
    }))
    window.electronAPI?.updateCaptureJob(regionId, region)
  },

  setCaptureInterval: (regionId, interval) => {
    set((state) => ({
      captureIntervals: { ...state.captureIntervals, [regionId]: interval }
    }))
    window.electronAPI?.setCaptureInterval(regionId, interval)
  },

  setOcrSettings: (settings) => {
    const updated = { ...get().ocrSettings, ...settings }
    set({ ocrSettings: updated })
    window.electronAPI?.updateOcrSettings(settings)
  },

  openRegionSelector: () => set({ isRegionSelectorOpen: true, isSettingsOpen: false }),
  closeRegionSelector: () => set({ isRegionSelectorOpen: false, isSettingsOpen: true }),

  loadFullSettings: (settings) => {
    const overlay = (settings.overlay ?? {}) as Record<string, unknown>
    const theme = (overlay.theme === 'light' ? 'light' : 'dark') as Theme
    const opacity = typeof overlay.opacity === 'number' ? overlay.opacity : get().overlayOpacity
    set({
      captureRegions: (settings.captureRegions as Record<string, CaptureRegion>) || {},
      captureIntervals: (settings.captureIntervals as Record<string, number>) || {},
      ocrSettings: (settings.ocr as OcrSettings) || DEFAULT_OCR,
      overlayOpacity: opacity,
      theme
    })
  }
}),
    {
      name: 'settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        hudPanel: state.hudPanel,
        sections: state.sections,
        overlayOpacity: state.overlayOpacity,
        theme: state.theme,
        isLocked: state.isLocked,
        isVisible: state.isVisible
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<SettingsState> | undefined
        if (!saved) return current
        const theme = saved.theme ?? current.theme
        return {
          ...current,
          hudPanel: { ...current.hudPanel, ...saved.hudPanel },
          sections: { ...current.sections, ...saved.sections },
          overlayOpacity: saved.overlayOpacity ?? current.overlayOpacity,
          theme,
          isLocked: saved.isLocked ?? current.isLocked,
          isVisible: saved.isVisible ?? current.isVisible
        }
      }
    }
  )
)
