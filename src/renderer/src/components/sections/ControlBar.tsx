import React, { useCallback } from 'react'
import { useSettingsStore } from '../../stores/settings-store'

/** 控制列，提供鎖定/解鎖、OCR 開關、設定、日誌與關閉按鈕 */
export const ControlBar: React.FC = () => {
  const isLocked = useSettingsStore((s) => s.isLocked)
  const setLocked = useSettingsStore((s) => s.setLocked)
  const isCaptureRunning = useSettingsStore((s) => s.isCaptureRunning)
  const toggleCapture = useSettingsStore((s) => s.toggleCapture)
  const openSettings = useSettingsStore((s) => s.openSettings)

  const handleToggleLock = useCallback(async () => {
    const newIsLocked = await window.electronAPI?.toggleClickThrough()
    if (newIsLocked !== undefined) {
      setLocked(newIsLocked)
      window.electronAPI.trackEvent('settings.opened', { action: 'toggle_lock', locked: newIsLocked })
    }
  }, [setLocked])

  const handleToggleCapture = useCallback(async () => {
    await toggleCapture()
    const running = useSettingsStore.getState().isCaptureRunning
    window.electronAPI.trackEvent('capture.toggled', { running, source: 'control_bar' })
  }, [toggleCapture])

  const handleOpenSettings = useCallback(() => {
    openSettings()
    window.electronAPI.trackEvent('settings.opened', { source: 'control_bar' })
  }, [openSettings])

  return (
    <div className="hud-control">
      <button
        className={`hud-ctrl-btn ${isLocked ? '' : 'active'}`}
        onClick={handleToggleLock}
      >
        {isLocked ? '鎖定模式' : '互動模式'}
      </button>
      <button
        className={`hud-ctrl-btn ${isCaptureRunning ? 'active' : 'off'}`}
        onClick={handleToggleCapture}
      >
        {isCaptureRunning ? '擷取中' : '已停止'}
      </button>
      <button className="hud-ctrl-btn" onClick={handleOpenSettings}>
        設定
      </button>
      <button className="hud-ctrl-btn" onClick={() => window.electronAPI?.openLogViewer()}>
        日誌
      </button>
      <button className="hud-ctrl-btn close" onClick={() => window.electronAPI?.quitApp()}>
        關閉
      </button>
    </div>
  )
}
