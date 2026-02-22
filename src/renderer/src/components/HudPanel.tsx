import React, { useCallback } from 'react'
import { useDraggable } from '../hooks/useDraggable'
import { useSettingsStore } from '../stores/settings-store'
import { CaptureToast } from './common/CaptureToast'
import { HudTopBar } from './sections/HudTopBar'
import { StatusBars } from './sections/StatusBars'
import { QuickStats } from './sections/QuickStats'
import { HudSection } from './sections/HudSection'
import { DamageDetail } from './sections/DamageDetail'
import { TimerList } from './sections/TimerList'
import { MapInfo } from './sections/MapInfo'
import { ControlBar } from './sections/ControlBar'

interface ToastMessage {
  id: number
  type: 'warning' | 'success'
  text: string
}

interface HudPanelProps {
  toasts: ToastMessage[]
  onDismissToast: (id: number) => void
}

/** 模組層級旗標，供 App.tsx 判斷滑鼠是否停留在 HUD 上 */
export let isHudHovered = false

/** HUD 主面板，包含狀態條、快速統計、可摺疊區段與控制列 */
export const HudPanel: React.FC<HudPanelProps> = ({ toasts, onDismissToast }) => {
  const hudPanel = useSettingsStore((s) => s.hudPanel)
  const isLocked = useSettingsStore((s) => s.isLocked)
  const overlayOpacity = useSettingsStore((s) => s.overlayOpacity)
  const setHudPosition = useSettingsStore((s) => s.setHudPosition)

  const { position, handleMouseDown } = useDraggable({
    initialPosition: { x: hudPanel.x, y: hudPanel.y },
    enabled: !isLocked,
    onPositionChange: (pos) => setHudPosition(pos.x, pos.y)
  })

  // Temporarily disable click-through when hovering HUD (both locked & unlocked)
  const handleMouseEnter = useCallback(() => {
    isHudHovered = true
    window.electronAPI?.setMousePassthrough(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    isHudHovered = false
    // Don't re-enable passthrough if a modal is open
    if (!useSettingsStore.getState().isSettingsOpen && !useSettingsStore.getState().isRegionSelectorOpen) {
      window.electronAPI?.setMousePassthrough(true)
    }
  }, [])

  return (
    <div
      className="hud-wrapper"
      data-locked={isLocked}
      style={{ left: position.x, top: position.y, width: hudPanel.width }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hud" style={{ opacity: overlayOpacity }} onMouseDown={handleMouseDown}>
        <HudTopBar />
        <StatusBars />
        <div className="hud-divider" />
        <QuickStats />
        <HudSection id="damage" label="傷害詳情">
          <DamageDetail />
        </HudSection>
        <HudSection id="timers" label="計時器">
          <TimerList />
        </HudSection>
        <HudSection id="map" label="地圖">
          <MapInfo />
        </HudSection>
        <ControlBar />
      </div>
      <CaptureToast toasts={toasts} onDismiss={onDismissToast} />
    </div>
  )
}
