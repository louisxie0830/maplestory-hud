import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../lib/idb-storage'
import { DEFAULT_OCR_CONFIDENCE, DEFAULT_PREPROCESS_THRESHOLD, DEFAULT_OVERLAY_OPACITY } from '../../../shared/constants'
import type { CaptureRegion, OcrSettings } from '../types/settings'

type SettingsTab = 'general' | 'capture' | 'calibration' | 'advanced' | 'about'

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
  locale: 'zh-TW' | 'en'
  performanceMode: 'balanced' | 'performance' | 'power-saver'
  accessibility: {
    fontScale: number
    highContrast: boolean
  }
  hotkeys: {
    toggleCapture: string
    resetStats: string
    toggleLock: string
    screenshot: string
  }
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
  setLocale: (locale: 'zh-TW' | 'en') => void
  setPerformanceMode: (mode: 'balanced' | 'performance' | 'power-saver') => void
  setAccessibility: (settings: { fontScale?: number; highContrast?: boolean }) => void
  setHotkeys: (hotkeys: { toggleCapture: string; resetStats: string; toggleLock: string; screenshot: string }) => Promise<{ ok: boolean; conflicts: string[] }>
  setLocked: (locked: boolean) => void
  setVisible: (visible: boolean) => void
  resetHudPosition: () => void
  applyLayoutTemplate: (template: 'minimal' | 'boss' | 'grind') => void

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
  locale: 'zh-TW',
  performanceMode: 'balanced',
  accessibility: { fontScale: 1, highContrast: false },
  hotkeys: { toggleCapture: 'F7', resetStats: 'F8', toggleLock: 'F9', screenshot: 'F10' },
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
  setLocale: (locale) => {
    set({ locale })
    window.electronAPI?.updateSettings({ locale }).catch(() => {})
  },
  setPerformanceMode: (mode) => {
    set({ performanceMode: mode })
    window.electronAPI?.updateSettings({ performance: { mode } }).catch(() => {})
  },
  setAccessibility: (settings) => {
    const current = get().accessibility
    const next = {
      fontScale: settings.fontScale ?? current.fontScale,
      highContrast: settings.highContrast ?? current.highContrast
    }
    set({ accessibility: next })
    window.electronAPI?.updateSettings({ accessibility: next }).catch(() => {})
  },
  setHotkeys: async (hotkeys) => {
    const result = await window.electronAPI?.updateHotkeys(hotkeys)
    if (result?.ok) {
      set({ hotkeys })
    }
    return result ?? { ok: false, conflicts: ['IPC not ready'] }
  },

  setLocked: (locked) => set({ isLocked: locked }),
  setVisible: (visible) => set({ isVisible: visible }),

  resetHudPosition: () => {
    set({ hudPanel: DEFAULT_HUD, sections: DEFAULT_SECTIONS })
  },
  applyLayoutTemplate: (template) => {
    if (template === 'minimal') {
      set({
        hudPanel: { ...get().hudPanel, width: 230 },
        sections: { damage: { collapsed: true }, timers: { collapsed: false }, map: { collapsed: true } }
      })
      return
    }
    if (template === 'boss') {
      set({
        hudPanel: { ...get().hudPanel, width: 280 },
        sections: { damage: { collapsed: false }, timers: { collapsed: false }, map: { collapsed: true } }
      })
      return
    }
    set({
      hudPanel: { ...get().hudPanel, width: 270 },
      sections: { damage: { collapsed: true }, timers: { collapsed: false }, map: { collapsed: false } }
    })
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

  openSettings: (tab) => {
    set({ isSettingsOpen: true, settingsTab: tab || 'general' })
    window.electronAPI?.setMousePassthrough(false).catch(() => {})
  },
  closeSettings: () => {
    set({ isSettingsOpen: false })
  },
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

  openRegionSelector: () => {
    set({ isRegionSelectorOpen: true, isSettingsOpen: false })
    window.electronAPI?.setMousePassthrough(false).catch(() => {})
  },
  closeRegionSelector: () => {
    set({ isRegionSelectorOpen: false, isSettingsOpen: true })
    window.electronAPI?.setMousePassthrough(false).catch(() => {})
  },

  loadFullSettings: (settings) => {
    const overlay = (settings.overlay ?? {}) as Record<string, unknown>
    const theme = (overlay.theme === 'light' ? 'light' : 'dark') as Theme
    const opacity = typeof overlay.opacity === 'number' ? overlay.opacity : get().overlayOpacity
    const locale = settings.locale === 'en' ? 'en' : 'zh-TW'
    const performance = (settings.performance as { mode?: 'balanced' | 'performance' | 'power-saver' } | undefined)?.mode ?? 'balanced'
    const accessibility = settings.accessibility as { fontScale?: number; highContrast?: boolean } | undefined
    const hotkeys = settings.hotkeys as { toggleCapture?: string; resetStats?: string; toggleLock?: string; screenshot?: string } | undefined
    set({
      captureRegions: (settings.captureRegions as Record<string, CaptureRegion>) || {},
      captureIntervals: (settings.captureIntervals as Record<string, number>) || {},
      ocrSettings: (settings.ocr as OcrSettings) || DEFAULT_OCR,
      overlayOpacity: opacity,
      theme,
      locale,
      performanceMode: performance,
      accessibility: {
        fontScale: typeof accessibility?.fontScale === 'number' ? accessibility.fontScale : 1,
        highContrast: accessibility?.highContrast === true
      },
      hotkeys: {
        toggleCapture: hotkeys?.toggleCapture || 'F7',
        resetStats: hotkeys?.resetStats || 'F8',
        toggleLock: hotkeys?.toggleLock || 'F9',
        screenshot: hotkeys?.screenshot || 'F10'
      }
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
        locale: state.locale,
        performanceMode: state.performanceMode,
        accessibility: state.accessibility,
        hotkeys: state.hotkeys,
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
          locale: saved.locale ?? current.locale,
          performanceMode: saved.performanceMode ?? current.performanceMode,
          accessibility: saved.accessibility ?? current.accessibility,
          hotkeys: saved.hotkeys ?? current.hotkeys,
          isLocked: saved.isLocked ?? current.isLocked,
          isVisible: saved.isVisible ?? current.isVisible
        }
      }
    }
  )
)
