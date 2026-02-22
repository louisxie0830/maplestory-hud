import React from 'react'
import { useSettingsStore } from '../../stores/settings-store'

interface HudSectionProps {
  id: string
  label: string
  children: React.ReactNode
}

/** 可摺疊的 HUD 區段容器，根據設定記住展開/收合狀態 */
export const HudSection: React.FC<HudSectionProps> = ({ id, label, children }) => {
  const collapsed = useSettingsStore((s) => s.sections[id]?.collapsed ?? false)
  const toggleSection = useSettingsStore((s) => s.toggleSection)

  return (
    <div className={`hud-section ${collapsed ? 'collapsed' : ''}`}>
      <button className="hud-section-header" onClick={() => toggleSection(id)}>
        <span className="hud-section-arrow">{collapsed ? '\u25b8' : '\u25be'}</span>
        <span className="hud-section-label">{label}</span>
        <span className="hud-section-line" />
      </button>
      {!collapsed && <div className="hud-section-body">{children}</div>}
    </div>
  )
}
