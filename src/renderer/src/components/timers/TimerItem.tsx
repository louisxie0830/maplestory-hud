import React from 'react'
import { formatTime } from '../../lib/format'
import type { TimerState } from '../../types/timer'

interface TimerItemProps {
  timer: TimerState
  onStart: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}

/** 單一計時器項目，顯示倒數時間並提供啟動、重置與刪除操作 */
export const TimerItem: React.FC<TimerItemProps> = ({ timer, onStart, onReset, onRemove }) => {
  return (
    <div className="timer-item">
      <div className="timer-info">
        <div className="timer-name">{timer.name}</div>
        <div className={`timer-countdown ${timer.isExpired ? 'expired' : ''}`}>
          {timer.isExpired ? '已到期!' : formatTime(timer.remainingMs)}
        </div>
      </div>
      <div className="timer-actions">
        {!timer.isRunning && !timer.isExpired && (
          <button className="timer-action-btn" onClick={() => onStart(timer.id)} title="開始">
            &#9654;
          </button>
        )}
        <button className="timer-action-btn" onClick={() => onReset(timer.id)} title="重置">
          &#8634;
        </button>
        <button className="timer-action-btn danger" onClick={() => onRemove(timer.id)} title="刪除">
          &#10005;
        </button>
      </div>
    </div>
  )
}
