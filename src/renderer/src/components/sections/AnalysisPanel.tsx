import React, { useEffect, useMemo, useState } from 'react'
import { useCharacterStore } from '../../stores/character-store'
import { useAnalysisStore } from '../../stores/analysis-store'
import { formatFullNumber, formatPercent, formatTime, formatMinutes } from '../../lib/format'
import { classifyOcrHealth, pickWeakestRegion, type OcrHealthRow } from '../../lib/ocr-health'

function formatRegion(regionId: string): string {
  if (regionId === 'hp') return 'HP'
  if (regionId === 'mp') return 'MP'
  if (regionId === 'exp') return 'EXP'
  // if (regionId === 'meso') return '楓幣'
  return regionId
}

/** 分析面板 — Notion 風格：key-value rows + 可折疊 OCR health + table rows */
export const AnalysisPanel: React.FC = () => {
  const expPercent = useCharacterStore((s) => s.expPercent)
  const expRawValue = useCharacterStore((s) => s.expRawValue)
  const expPerHour = useCharacterStore((s) => s.expPerHour)
  const expGained10m = useCharacterStore((s) => s.expGained10m)
  const expGained60m = useCharacterStore((s) => s.expGained60m)
  const expProjected10m = useCharacterStore((s) => s.expProjected10m)
  const expProjected60m = useCharacterStore((s) => s.expProjected60m)
  const minutesToLevelUp = useCharacterStore((s) => s.minutesToLevelUp)
  // const meso = useCharacterStore((s) => s.meso)
  // const mesoPerHour = useCharacterStore((s) => s.mesoPerHour)

  const sessionStartedAt = useAnalysisStore((s) => s.sessionStartedAt)
  const records = useAnalysisStore((s) => s.records)
  const totalCount = useAnalysisStore((s) => s.totalCount)
  const removeRecentRecord = useAnalysisStore((s) => s.removeRecentRecord)
  const resetAnalysis = useAnalysisStore((s) => s.resetAnalysis)
  const [ocrHealth, setOcrHealth] = useState<OcrHealthRow[]>([])
  const [healthOpen, setHealthOpen] = useState(false)

  const sessionDurationMs = Date.now() - sessionStartedAt
  const expRemain = useMemo(() => Math.max(0, 100 - expPercent), [expPercent])
  const recentRows = records.slice(-14).reverse()
  const weakest = useMemo(() => pickWeakestRegion(ocrHealth), [ocrHealth])
  const healthStatus = weakest ? classifyOcrHealth(weakest) : 'ok'

  useEffect(() => {
    let alive = true
    const refresh = async (): Promise<void> => {
      const rows = await window.electronAPI.getOcrHealth()
      if (!alive) return
      setOcrHealth(
        rows
          .filter((r) => ['hp', 'mp', 'exp' /* , 'meso' */].includes(r.regionId))
          .map((r) => ({
            regionId: r.regionId,
            total: r.total,
            successRate: r.successRate,
            avgLatencyMs: r.avgLatencyMs,
            avgConfidence: r.avgConfidence
          }))
      )
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 5000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const healthSummaryText = ocrHealth.length === 0
    ? '尚無資料'
    : healthStatus === 'ok'
      ? '全部正常'
      : `${formatRegion(weakest!.regionId)} 需要注意`

  return (
    <div className="hud-analysis">
      {/* OCR Health — 可折疊 */}
      <div className="hud-analysis-health">
        <div className="hud-health-summary" onClick={() => setHealthOpen(!healthOpen)}>
          <span className="hud-section-title">
            OCR 健康狀態 — <span style={{ fontWeight: 400, textTransform: 'none' }}>{healthSummaryText}</span>
          </span>
          <span className="hud-health-toggle">{healthOpen ? '收合' : '展開'}</span>
        </div>
        {healthOpen && (
          <div className="hud-health-detail">
            {weakest && healthStatus !== 'ok' && (
              <div className="hud-health-alert">建議重新校準：{formatRegion(weakest.regionId)}</div>
            )}
            {ocrHealth.length === 0 && <div className="hud-empty">尚無 OCR 健康資料</div>}
            {ocrHealth.map((row) => {
              const status = classifyOcrHealth(row)
              return (
                <div key={row.regionId} className="hud-health-row">
                  <span className={`hud-chip ${status}`}>{formatRegion(row.regionId)}</span>
                  <span className="hud-health-metric">成功率 {Math.round(row.successRate * 100)}%</span>
                  <span className="hud-health-metric">信心 {Math.round(row.avgConfidence * 100)}%</span>
                  <span className="hud-health-metric">延遲 {Math.round(row.avgLatencyMs)}ms</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats — 2-column grid */}
      <div className="hud-analysis-grid">
        <div className="hud-stat">
          <span className="hud-stat-label">目前 EXP</span>
          <span className="hud-stat-value success">{formatPercent(expPercent)}</span>
          <span className="hud-stat-sub">{expRawValue > 0 ? formatFullNumber(expRawValue) : '--'}</span>
        </div>
        <div className="hud-stat"><span className="hud-stat-label">每小時 EXP</span><span className="hud-stat-value success">{formatPercent(expPerHour)}</span></div>
        <div className="hud-stat"><span className="hud-stat-label">10 分鐘預估</span><span className="hud-stat-value">{formatPercent(expProjected10m)}</span></div>
        <div className="hud-stat"><span className="hud-stat-label">60 分鐘預估</span><span className="hud-stat-value">{formatPercent(expProjected60m)}</span></div>
        <div className="hud-stat"><span className="hud-stat-label">10 分鐘累積</span><span className="hud-stat-value">{formatPercent(expGained10m)}</span></div>
        <div className="hud-stat"><span className="hud-stat-label">60 分鐘累積</span><span className="hud-stat-value">{formatPercent(expGained60m)}</span></div>
        <div className="hud-stat"><span className="hud-stat-label">升級剩餘</span><span className="hud-stat-value warning">{formatPercent(expRemain)}</span></div>
        <div className="hud-stat"><span className="hud-stat-label">升級時間</span><span className="hud-stat-value warning">{formatMinutes(minutesToLevelUp)}</span></div>
      </div>

      {/* Meta — key-value rows */}
      <div className="hud-analysis-meta">
        {/* <div className="hud-row"><span className="hud-stat-label">目前金錢</span><span className="hud-stat-value">{formatFullNumber(meso)}</span></div> */}
        {/* <div className="hud-row"><span className="hud-stat-label">每小時金錢</span><span className="hud-stat-value">{formatFullNumber(mesoPerHour)}</span></div> */}
        <div className="hud-row"><span className="hud-stat-label">開始時間</span><span className="hud-stat-value">{new Date(sessionStartedAt).toLocaleTimeString()}</span></div>
        <div className="hud-row"><span className="hud-stat-label">統計時長</span><span className="hud-stat-value">{formatTime(sessionDurationMs)}</span></div>
        <div className="hud-row"><span className="hud-stat-label">資料筆數</span><span className="hud-stat-value">{totalCount}</span></div>
        <button className="hud-btn danger full" onClick={resetAnalysis}>重置分析資料</button>
      </div>

      {/* Recent OCR — Notion table rows */}
      <div className="hud-analysis-recent">
        <div className="hud-section-title" style={{ marginBottom: 8 }}>最近 OCR 結果（5 分鐘內可刪）</div>
        {recentRows.length === 0 && <div className="hud-empty">尚無最近資料</div>}
        {recentRows.map((r) => {
          const canDelete = Date.now() - r.timestamp <= 5 * 60 * 1000
          return (
            <div key={r.id} className="hud-analysis-row">
              <span className="hud-analysis-time">{new Date(r.timestamp).toLocaleTimeString()}</span>
              <span className="hud-analysis-region">{formatRegion(r.regionId)}</span>
              <span className="hud-analysis-value">{r.valueText}</span>
              <span className="hud-analysis-conf">{Math.round(r.confidence * 100)}%</span>
              <button className="hud-icon-btn" onClick={() => removeRecentRecord(r.id)} disabled={!canDelete} title={canDelete ? '刪除資料' : '僅能刪除 5 分鐘內資料'}>刪</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
