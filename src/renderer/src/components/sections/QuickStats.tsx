import React from 'react'
import { useCharacterStore } from '../../stores/character-store'
import { useDamageStore } from '../../stores/damage-store'
import { formatNumber, formatPercent, formatMinutes } from '../../lib/format'

/** 快速統計列，顯示 DPM、EXP/hr、楓幣/hr 與預估升級時間 */
export const QuickStats: React.FC = () => {
  const expPerHour = useCharacterStore((s) => s.expPerHour)
  const minutesToLevelUp = useCharacterStore((s) => s.minutesToLevelUp)
  const mesoPerHour = useCharacterStore((s) => s.mesoPerHour)
  const expGained10m = useCharacterStore((s) => s.expGained10m)
  const expGained60m = useCharacterStore((s) => s.expGained60m)
  const expProjected10m = useCharacterStore((s) => s.expProjected10m)
  const expProjected60m = useCharacterStore((s) => s.expProjected60m)
  const dpm = useDamageStore((s) => s.dpm)

  return (
    <div className="hud-stats">
      <div className="hud-stat">
        <span className="hud-stat-label">每分鐘傷害</span>
        <span className="hud-stat-value accent">{formatNumber(dpm)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">每小時 EXP</span>
        <span className="hud-stat-value success">{formatPercent(expPerHour)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">10 分鐘預估</span>
        <span className="hud-stat-value success">{formatPercent(expProjected10m)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">60 分鐘預估</span>
        <span className="hud-stat-value success">{formatPercent(expProjected60m)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">10 分鐘累積</span>
        <span className="hud-stat-value">{formatPercent(expGained10m)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">60 分鐘累積</span>
        <span className="hud-stat-value">{formatPercent(expGained60m)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">每小時楓幣</span>
        <span className="hud-stat-value warning">{formatNumber(mesoPerHour)}</span>
      </div>
      <div className="hud-stat">
        <span className="hud-stat-label">升級時間</span>
        <span className="hud-stat-value">{formatMinutes(minutesToLevelUp)}</span>
      </div>
    </div>
  )
}
