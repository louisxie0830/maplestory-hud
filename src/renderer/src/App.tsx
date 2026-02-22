import React, { useEffect, useState, useCallback, useRef } from 'react'
import { SetupWizard } from './components/setup/SetupWizard'
import { HudPanel, isHudHovered } from './components/HudPanel'
import { SettingsModal } from './components/settings/SettingsModal'
import { RegionSelector } from './components/settings/RegionSelector'
import { useCharacterStore } from './stores/character-store'
import { useDamageStore } from './stores/damage-store'
import { useSettingsStore } from './stores/settings-store'
import type { HpMpResult, ExpResult, DamageEntry, MesoResult } from './types/ocr-result'


interface ToastMessage {
  id: number
  type: 'warning' | 'success'
  text: string
}

let toastId = 0

/** 應用程式根元件，檢查首次設定狀態後決定顯示設定精靈或主 HUD */
const App: React.FC = () => {
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null)

  useEffect(() => {
    window.electronAPI.isSetupCompleted().then(setSetupCompleted)
  }, [])

  if (setupCompleted === null) return null
  if (!setupCompleted) {
    return <SetupWizard onComplete={() => setSetupCompleted(true)} />
  }
  return <HudApp />
}

/** 主 HUD 元件，註冊 OCR 結果監聽器並管理擷取狀態與通知 */
const HudApp: React.FC = () => {
  const setHp = useCharacterStore((s) => s.setHp)
  const setMp = useCharacterStore((s) => s.setMp)
  const setExp = useCharacterStore((s) => s.setExp)
  const setMeso = useCharacterStore((s) => s.setMeso)
  const addDamageEntries = useDamageStore((s) => s.addDamageEntries)
  const setLocked = useSettingsStore((s) => s.setLocked)
  const isLocked = useSettingsStore((s) => s.isLocked)
  const isSettingsOpen = useSettingsStore((s) => s.isSettingsOpen)
  const isRegionSelectorOpen = useSettingsStore((s) => s.isRegionSelectorOpen)
  const isCaptureRunning = useSettingsStore((s) => s.isCaptureRunning)
  const theme = useSettingsStore((s) => s.theme)

  // Sync theme to DOM — single source of truth
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Disable passthrough when modal/selector is open; restore only if mouse not on HUD
  useEffect(() => {
    if (isSettingsOpen || isRegionSelectorOpen) {
      window.electronAPI?.setMousePassthrough(false)
    } else if (!isHudHovered) {
      window.electronAPI?.setMousePassthrough(true)
    }
  }, [isSettingsOpen, isRegionSelectorOpen])

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastTimers = useRef(new Set<ReturnType<typeof setTimeout>>())

  // Cleanup all toast timers on unmount
  useEffect(() => () => {
    for (const t of toastTimers.current) clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isCaptureRunning) {
      setToasts((prev) => prev.filter((t) => t.type !== 'warning'))
    }
  }, [isCaptureRunning])

  const addToast = useCallback((type: 'warning' | 'success', text: string) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, type, text }])
    if (type === 'success') {
      const timer = setTimeout(() => {
        toastTimers.current.delete(timer)
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
      toastTimers.current.add(timer)
    }
  }, [])

  const clearWarnings = useCallback(() => {
    setToasts((prev) => prev.filter((t) => t.type !== 'warning'))
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const api = window.electronAPI
    const cleanups: Array<() => void> = []

    cleanups.push(api.onOcrResult('hp', (data) => {
      const result = data as { data: HpMpResult }
      if (result.data) setHp(result.data.current, result.data.max)
    }))

    cleanups.push(api.onOcrResult('mp', (data) => {
      const result = data as { data: HpMpResult }
      if (result.data) setMp(result.data.current, result.data.max)
    }))

    cleanups.push(api.onOcrResult('exp', (data) => {
      const result = data as { data: ExpResult }
      if (result.data) setExp(result.data.percent)
    }))

    cleanups.push(api.onOcrResult('damage', (data) => {
      const result = data as { data: DamageEntry[] }
      if (result.data && result.data.length > 0) addDamageEntries(result.data)
    }))

    cleanups.push(api.onOcrResult('meso', (data) => {
      const result = data as { data: MesoResult }
      if (result.data) setMeso(result.data.amount)
    }))

    cleanups.push(api.onModeChanged((mode) => {
      setLocked(mode === 'locked')
    }))

    cleanups.push(api.onCaptureAutoPaused(() => {
      useSettingsStore.getState().setCaptureRunning(false)
      addToast('warning', '找不到遊戲視窗，擷取已暫停')
    }))

    cleanups.push(api.onCaptureAutoResumed(() => {
      useSettingsStore.getState().setCaptureRunning(true)
      clearWarnings()
      addToast('success', '遊戲視窗偵測到，擷取已恢復')
    }))

    cleanups.push(api.onCaptureToggled((running) => {
      useSettingsStore.getState().setCaptureRunning(running)
      addToast('success', running ? '擷取已啟動 (F7)' : '擷取已暫停 (F7)')
    }))

    cleanups.push(api.onStatsReset(() => {
      useCharacterStore.getState().resetExpHistory()
      useDamageStore.getState().resetSession()
      addToast('success', '統計已重置 (F8)')
    }))

    cleanups.push(api.onScreenshotTaken((filePath) => {
      const filename = filePath.split(/[/\\]/).pop() || filePath
      addToast('success', `截圖：${filename}`)
    }))

    cleanups.push(api.onOpacityChanged((opacity) => {
      useSettingsStore.getState().setOverlayOpacity(opacity)
    }))

    api.getSettings().then((settings) => {
      useSettingsStore.getState().loadFullSettings(settings)
    })

    api.getCaptureRunning().then((running) => {
      useSettingsStore.getState().setCaptureRunning(running)
    })

    return () => { cleanups.forEach((c) => c()) }
  }, [setHp, setMp, setExp, setMeso, addDamageEntries, setLocked, addToast, clearWarnings])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <HudPanel toasts={toasts} onDismissToast={dismissToast} />
      {isSettingsOpen && <SettingsModal />}
      {isRegionSelectorOpen && <RegionSelector />}
    </div>
  )
}

export default App
