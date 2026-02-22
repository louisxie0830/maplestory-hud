import React, { useState } from 'react'
import { useDamageStore } from '../../stores/damage-store'
import { formatNumber, formatFullNumber, formatTime } from '../../lib/format'

/** 傷害詳情面板，顯示 DPM、總傷害、Boss 擊殺估算與匯出功能 */
export const DamageDetail: React.FC = () => {
  const peakDpm = useDamageStore((s) => s.peakDpm)
  const totalDamage = useDamageStore((s) => s.totalDamage)
  const sessionStart = useDamageStore((s) => s.sessionStart)
  const damageLog = useDamageStore((s) => s.damageLog)
  const dpm = useDamageStore((s) => s.dpm)
  const bossHp = useDamageStore((s) => s.bossHp)
  const estimatedKillTime = useDamageStore((s) => s.estimatedKillTime)
  const setBossHp = useDamageStore((s) => s.setBossHp)
  const resetSession = useDamageStore((s) => s.resetSession)

  const [bossInput, setBossInput] = useState('')
  const sessionDuration = sessionStart ? Date.now() - sessionStart : 0

  const handleBossSubmit = (): void => {
    let value = bossInput
    if (!value.trim()) {
      const result = window.prompt('輸入 Boss HP')
      if (!result) return
      value = result
      setBossInput(value)
    }
    const parsed = parseFloat(value.replace(/,/g, ''))
    if (!isNaN(parsed) && parsed > 0) setBossHp(parsed)
  }

  const handleExport = async (): Promise<void> => {
    const rows = damageLog.map((e) => [
      new Date(e.timestamp).toISOString(),
      String(e.value)
    ])
    await window.electronAPI?.exportCsv({
      filename: `damage-log-${Date.now()}.csv`,
      headers: ['timestamp', 'damage'],
      rows
    })
  }

  return (
    <div className="hud-damage">
      <div className="hud-stats compact">
        <div className="hud-stat">
          <span className="hud-stat-label">Peak</span>
          <span className="hud-stat-value">{formatNumber(peakDpm)}</span>
        </div>
        <div className="hud-stat">
          <span className="hud-stat-label">Total</span>
          <span className="hud-stat-value">{formatFullNumber(totalDamage)}</span>
        </div>
        <div className="hud-stat">
          <span className="hud-stat-label">時長</span>
          <span className="hud-stat-value">{formatTime(sessionDuration)}</span>
        </div>
      </div>

      <DamageSparkline entries={damageLog} />

      {/* Boss kill estimation */}
      <div className="hud-boss-row">
        <input
          className="hud-input"
          type="text"
          placeholder="Boss HP..."
          value={bossInput}
          onChange={(e) => setBossInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBossSubmit()}
          onFocus={(e) => e.target.select()}
        />
        <button className="hud-btn" onClick={handleBossSubmit}>設定</button>
        {bossHp > 0 && (
          <button className="hud-btn" onClick={() => { setBossHp(0); setBossInput('') }}>✕</button>
        )}
      </div>
      {bossHp > 0 && (
        <div className="hud-row">
          <span className="hud-stat-label">Boss Kill</span>
          <span className="hud-stat-value accent">
            {dpm > 0 && estimatedKillTime > 0 ? formatTime(estimatedKillTime) : '--'}
          </span>
        </div>
      )}

      <div className="hud-action-row">
        <button className="hud-btn" onClick={handleExport} title="匯出 CSV">匯出</button>
        <button className="hud-btn danger" onClick={resetSession} title="重置紀錄">重置</button>
      </div>
    </div>
  )
}

/** 傷害迷你折線圖，繪製最近 60 秒的傷害分佈 */
const DamageSparkline = React.memo<{ entries: Array<{ value: number; timestamp: number }> }>(({
  entries
}) => {
  if (entries.length < 2) return null

  const now = Date.now()
  const buckets = new Array(60).fill(0)

  for (const entry of entries) {
    const secondsAgo = Math.floor((now - entry.timestamp) / 1000)
    if (secondsAgo >= 0 && secondsAgo < 60) {
      buckets[59 - secondsAgo] += entry.value
    }
  }

  const maxBucket = Math.max(...buckets, 1)
  const w = 200
  const h = 36

  const points = buckets.map((value, i) => {
    const x = (i / 59) * w
    const y = h - (value / maxBucket) * (h - 2)
    return `${x},${y}`
  })

  const areaPath = `M 0,${h} L ${points.join(' L ')} L ${w},${h} Z`
  const linePath = `M ${points.join(' L ')}`

  return (
    <svg className="hud-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
})
