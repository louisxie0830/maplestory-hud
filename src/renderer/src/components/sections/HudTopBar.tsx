import React from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useCharacterStore } from '../../stores/character-store'

function formatLastSeen(lastUpdate: number): string {
  if (!lastUpdate) return '尚未讀取'
  const sec = Math.max(0, Math.floor((Date.now() - lastUpdate) / 1000))
  if (sec < 2) return '即時'
  if (sec < 60) return `${sec}s 前`
  const min = Math.floor(sec / 60)
  return `${min}m 前`
}

/** HUD 頂部狀態列，集中顯示模式、擷取狀態與快捷鍵提示 */
export const HudTopBar: React.FC = () => {
  const isLocked = useSettingsStore((s) => s.isLocked)
  const isCaptureRunning = useSettingsStore((s) => s.isCaptureRunning)
  const lastUpdate = useCharacterStore((s) => s.lastUpdate)
  const signalSec = lastUpdate ? Math.floor((Date.now() - lastUpdate) / 1000) : Infinity
  const signalClass = signalSec <= 2 ? 'ok' : signalSec <= 8 ? 'warn' : 'error'
  const signalText = signalSec <= 2 ? 'OCR 正常' : signalSec <= 8 ? 'OCR 不穩' : 'OCR 中斷'

  return (
    <div className="hud-topbar">
      <div className="hud-topbar-title">
        <span className="hud-title-main">Maple HUD</span>
        <span className="hud-title-sub">Live Detect Console</span>
      </div>
      <div className="hud-topbar-status">
        <span className={`hud-chip ${isCaptureRunning ? 'ok' : 'warn'}`}>
          {isCaptureRunning ? '擷取中' : '已暫停'}
        </span>
        <span className={`hud-chip ${signalClass}`}>
          {signalText}
        </span>
        <span className={`hud-chip ${isLocked ? '' : 'accent'}`}>
          {isLocked ? '鎖定' : '互動'}
        </span>
        <span className="hud-chip subtle">更新 {formatLastSeen(lastUpdate)}</span>
      </div>
      <div className="hud-hotkeys">
        <span>F7 開始/暫停</span>
        <span>F8 重置統計</span>
        <span>F9 鎖定切換</span>
        <span>F10 擷取畫面</span>
      </div>
    </div>
  )
}
