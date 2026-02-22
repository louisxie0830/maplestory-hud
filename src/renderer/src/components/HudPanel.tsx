import React from 'react'
import { CaptureToast } from './common/CaptureToast'
import { HudTopBar } from './sections/HudTopBar'
import { AnalysisPanel } from './sections/AnalysisPanel'
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

/** HUD 主面板：狀態列 + 控制中心 + 分析面板 */
export const HudPanel: React.FC<HudPanelProps> = ({ toasts, onDismissToast }) => {
  return (
    <div className="hud-wrapper">
      <div className="hud">
        <HudTopBar />
        <ControlBar />
        <AnalysisPanel />
      </div>
      <CaptureToast toasts={toasts} onDismiss={onDismissToast} />
    </div>
  )
}
