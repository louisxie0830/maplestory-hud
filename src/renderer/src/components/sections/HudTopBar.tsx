import React from 'react'
import { useCharacterStore } from '../../stores/character-store'
import { useSettingsStore } from '../../stores/settings-store'

/** HUD 頂部狀態列 — Notion 風格：標題 + 狀態圓點 */
export const HudTopBar: React.FC = () => {
  const isCaptureRunning = useSettingsStore((s) => s.isCaptureRunning)
  const lastUpdate = useCharacterStore((s) => s.lastUpdate)
  const signalSec = lastUpdate ? Math.floor((Date.now() - lastUpdate) / 1000) : Infinity
  const signalClass = signalSec <= 2 ? 'ok' : signalSec <= 8 ? 'warn' : 'error'
  const signalText = signalSec <= 2 ? 'OCR 正常' : signalSec <= 8 ? 'OCR 不穩' : 'OCR 中斷'

  return (
    <div className="hud-topbar">
      <div className="hud-topbar-title">
        <span className="hud-title-main">Maple HUD</span>
      </div>
      <div className="hud-topbar-status">
        <span className="hud-status-item">
          <span className={`hud-status-dot ${isCaptureRunning ? 'ok' : 'warn'}`} />
          {isCaptureRunning ? '擷取中' : '已暫停'}
        </span>
        <span className="hud-status-item">
          <span className={`hud-status-dot ${signalClass}`} />
          {signalText}
        </span>
      </div>
    </div>
  )
}
