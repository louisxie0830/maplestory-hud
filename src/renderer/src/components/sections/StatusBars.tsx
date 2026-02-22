import React from 'react'
import { useCharacterStore } from '../../stores/character-store'
import { formatFullNumber, formatPercent } from '../../lib/format'

/** HP/MP/EXP 狀態條元件，以進度條與數值顯示角色當前狀態 */
export const StatusBars: React.FC = () => {
  const hp = useCharacterStore((s) => s.hp)
  const maxHp = useCharacterStore((s) => s.maxHp)
  const mp = useCharacterStore((s) => s.mp)
  const maxMp = useCharacterStore((s) => s.maxMp)
  const expPercent = useCharacterStore((s) => s.expPercent)

  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0
  const mpPct = maxMp > 0 ? (mp / maxMp) * 100 : 0

  return (
    <div className="hud-status">
      <div className="hud-bar-row">
        <span className="hud-bar-label hp">HP</span>
        <div className="hud-bar-track">
          <div className="hud-bar-fill hp" style={{ width: `${hpPct}%` }} />
        </div>
        <span className="hud-bar-value">{formatFullNumber(hp)}</span>
      </div>
      <div className="hud-bar-row">
        <span className="hud-bar-label mp">MP</span>
        <div className="hud-bar-track">
          <div className="hud-bar-fill mp" style={{ width: `${mpPct}%` }} />
        </div>
        <span className="hud-bar-value">{formatFullNumber(mp)}</span>
      </div>
      <div className="hud-bar-row">
        <span className="hud-bar-label exp">EXP</span>
        <div className="hud-bar-track">
          <div className="hud-bar-fill exp" style={{ width: `${expPercent}%` }} />
        </div>
        <span className="hud-bar-value">{formatPercent(expPercent)}</span>
      </div>
    </div>
  )
}
