import React, { useState, useEffect } from 'react'
import { useTimerStore } from '../../stores/timer-store'
import { formatTime } from '../../lib/format'
import { BOSS_PRESETS } from '../../../../shared/constants'

/** 計時器列表，支援 Boss 預設與自訂計時器的新增、啟動與管理 */
export const TimerList: React.FC = () => {
  const timers = useTimerStore((s) => s.timers)
  const addTimer = useTimerStore((s) => s.addTimer)
  const removeTimer = useTimerStore((s) => s.removeTimer)
  const startTimer = useTimerStore((s) => s.startTimer)
  const resetTimer = useTimerStore((s) => s.resetTimer)
  const tick = useTimerStore((s) => s.tick)

  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<'boss' | 'custom'>('boss')
  const [customName, setCustomName] = useState('')
  const [customMin, setCustomMin] = useState(30)

  useEffect(() => {
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [tick])

  const handleAddBoss = (name: string, minutes: number): void => {
    const id = addTimer({ name, type: 'boss', durationMs: minutes * 60 * 1000, recurring: false, alertSound: true })
    startTimer(id)
    setShowAdd(false)
  }

  const handleAddCustom = (): void => {
    if (!customName.trim()) return
    const id = addTimer({ name: customName.trim(), type: 'custom', durationMs: customMin * 60 * 1000, recurring: false, alertSound: true })
    startTimer(id)
    setCustomName('')
    setShowAdd(false)
  }

  return (
    <div className="hud-timers">
      {timers.length === 0 && !showAdd && (
        <div className="hud-empty">尚無計時器</div>
      )}

      {timers.map((t) => (
        <div key={t.id} className={`hud-timer-row ${t.isExpired ? 'expired' : ''}`}>
          <span className="hud-timer-name">{t.name}</span>
          <span className={`hud-timer-time ${t.isExpired ? 'expired' : ''}`}>
            {t.isExpired ? '到期' : formatTime(t.remainingMs)}
          </span>
          <div className="hud-timer-actions">
            {!t.isRunning && !t.isExpired && (
              <button className="hud-icon-btn" onClick={() => startTimer(t.id)} title="開始">&#9654;</button>
            )}
            <button className="hud-icon-btn" onClick={() => resetTimer(t.id)} title="重置">&#8634;</button>
            <button className="hud-icon-btn" onClick={() => removeTimer(t.id)} title="刪除">&#10005;</button>
          </div>
        </div>
      ))}

      {showAdd ? (
        <div className="hud-timer-add">
          <div className="hud-timer-add-tabs">
            <button className={addMode === 'boss' ? 'active' : ''} onClick={() => setAddMode('boss')}>BOSS</button>
            <button className={addMode === 'custom' ? 'active' : ''} onClick={() => setAddMode('custom')}>自訂</button>
          </div>
          {addMode === 'boss' ? (
            <div className="hud-timer-presets">
              {BOSS_PRESETS.map((b) => (
                <button key={b.name} className="hud-preset-item" onClick={() => handleAddBoss(b.name, b.minutes)}>
                  {b.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="hud-timer-custom">
              <input
                className="hud-input"
                placeholder="名稱"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              />
              <div className="hud-timer-custom-row">
                <input
                  className="hud-input small"
                  type="number"
                  min={1}
                  value={customMin}
                  onChange={(e) => setCustomMin(parseInt(e.target.value) || 1)}
                />
                <span className="hud-muted">分鐘</span>
                <button className="hud-btn accent" onClick={handleAddCustom}>新增</button>
              </div>
            </div>
          )}
          <button className="hud-btn full" onClick={() => setShowAdd(false)}>關閉</button>
        </div>
      ) : (
        <button className="hud-btn accent full" onClick={() => setShowAdd(true)}>+ 新增</button>
      )}
    </div>
  )
}
