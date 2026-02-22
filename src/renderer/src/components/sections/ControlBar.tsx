import React, { useCallback, useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'

interface GameWindowOption {
  id: string
  name: string
  isGameCandidate: boolean
}

/** 控制中心 — Notion 風格：視窗選擇 + 分析按鈕 */
export const ControlBar: React.FC = () => {
  const isCaptureRunning = useSettingsStore((s) => s.isCaptureRunning)
  const toggleCapture = useSettingsStore((s) => s.toggleCapture)

  const [windows, setWindows] = useState<GameWindowOption[]>([])
  const [selectedWindowId, setSelectedWindowId] = useState('')
  const [appliedWindowName, setAppliedWindowName] = useState('')
  const hasWindowTarget = selectedWindowId.trim().length > 0

  const refreshWindows = useCallback(async () => {
    const [options, selected] = await Promise.all([
      window.electronAPI.listGameWindows(),
      window.electronAPI.getSelectedGameWindow()
    ])
    setWindows(options)
    if (selected?.sourceId && options.some((w) => w.id === selected.sourceId)) {
      setSelectedWindowId(selected.sourceId)
      setAppliedWindowName(selected.windowName)
      return
    }
    if (options.length > 0) {
      setSelectedWindowId(options[0].id)
      setAppliedWindowName('')
    } else {
      setSelectedWindowId('')
      setAppliedWindowName('')
    }
  }, [])

  useEffect(() => {
    void refreshWindows()
  }, [refreshWindows])

  const handleToggleCapture = useCallback(async () => {
    await toggleCapture()
    const running = useSettingsStore.getState().isCaptureRunning
    window.electronAPI.trackEvent('capture.toggled', { running, source: 'control_bar' })
  }, [toggleCapture])

  const handleSelectWindow = useCallback(async () => {
    if (!selectedWindowId) return
    const selected = await window.electronAPI.selectGameWindow(selectedWindowId)
    if (selected) {
      setAppliedWindowName(selected.windowName)
      window.electronAPI.trackEvent('settings.opened', {
        source: 'control_bar',
        action: 'select_capture_window',
        window: selected.windowName
      })
    }
  }, [selectedWindowId])

  return (
    <div className="hud-control-center">
      <div className="hud-control-window-picker">
        <select
          className="hud-input full"
          value={selectedWindowId}
          onChange={(e) => setSelectedWindowId(e.target.value)}
        >
          {windows.length === 0 && <option value="">找不到可擷取視窗</option>}
          {windows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.isGameCandidate ? '[Maple] ' : ''}{w.name}
            </option>
          ))}
        </select>
        <button className="hud-btn" onClick={refreshWindows}>重整</button>
        <button className="hud-btn" onClick={handleSelectWindow} disabled={!hasWindowTarget}>套用</button>
      </div>
      {appliedWindowName && (
        <div className="hud-control-applied">已套用視窗：{appliedWindowName}</div>
      )}
      {!hasWindowTarget && <div className="hud-control-hint warning">請先選擇要擷取的遊戲視窗</div>}

      <button
        className="hud-btn primary full"
        onClick={handleToggleCapture}
        disabled={!isCaptureRunning && !hasWindowTarget}
      >
        {isCaptureRunning ? '暫停分析' : '開始分析'}
      </button>
    </div>
  )
}
