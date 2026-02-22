import React, { useState } from 'react'
import { BOSS_PRESETS } from '../../../../shared/constants'

interface AddTimerDialogProps {
  onAdd: (name: string, durationMinutes: number) => void
  onClose: () => void
}

/** 新增計時器對話框，提供 Boss 預設選擇與自訂計時器輸入 */
export const AddTimerDialog: React.FC<AddTimerDialogProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')

  return (
    <div className="add-timer-dialog">
      <div className="add-timer-tabs">
        <button
          className={`add-timer-tab ${mode === 'preset' ? 'active' : ''}`}
          onClick={() => setMode('preset')}
        >
          BOSS
        </button>
        <button
          className={`add-timer-tab ${mode === 'custom' ? 'active' : ''}`}
          onClick={() => setMode('custom')}
        >
          自訂
        </button>
      </div>

      {mode === 'preset' ? (
        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {BOSS_PRESETS.map((boss) => (
            <div
              key={boss.name}
              className="boss-preset-item"
              onClick={() => onAdd(boss.name, boss.minutes)}
            >
              {boss.name}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="計時器名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="number"
              className="input-number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>分鐘</span>
            <button
              className="btn-success"
              onClick={() => {
                if (name.trim()) onAdd(name.trim(), minutes)
              }}
            >
              新增
            </button>
          </div>
        </div>
      )}

      <button className="btn-ghost" onClick={onClose} style={{ width: '100%', textAlign: 'center' }}>
        關閉
      </button>
    </div>
  )
}
