import React from 'react'
import { useCharacterStore } from '../../stores/character-store'
import { useDamageStore } from '../../stores/damage-store'
import { formatNumber, formatPercent, formatMinutes } from '../../lib/format'

/** 快速統計列，顯示 DPM、EXP/hr、楓幣/hr 與預估升級時間 */
export const QuickStats: React.FC = () => {
  const expPerHour = useCharacterStore((s) => s.expPerHour)
  const minutesToLevelUp = useCharacterStore((s) => s.minutesToLevelUp)
  const mesoPerHour = useCharacterStore((s) => s.mesoPerHour)
  const dpm = useDamageStore((s) => s.dpm)

  return (
    <div className="hud-stats">
      <div className="hud-stat">
        <span className="hud-stat-label">DPM</span>
        <span className="hud-stat-value accent">{formatNumber(dpm)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">EXP/hr</span>
        <span className="hud-stat-value success">{formatPercent(expPerHour)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">楓幣/hr</span>
        <span className="hud-stat-value warning">{formatNumber(mesoPerHour)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">升級倒數</span>
        <span className="hud-stat-value">{formatMinutes(minutesToLevelUp)}</span>
      </div>
    </div>
  )
}
