import React, { useState, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { saveCaptureRegion } from '../../lib/db'
import { DEFAULT_CAPTURE_INTERVAL_MS } from '../../../../shared/constants'

const REGION_NAMES: Record<string, string> = {
  hp: 'HP 血量',
  mp: 'MP 魔力',
  exp: 'EXP 經驗',
  damage: '傷害數字',
  mapName: '地圖名稱'
}

const REGION_ORDER = ['hp', 'mp', 'exp', 'damage', 'mapName']

/** 擷取區域設定頁，管理各 OCR 區域的座標、大小、間隔與啟用狀態 */
export const CaptureTab: React.FC = () => {
  const captureRegions = useSettingsStore((s) => s.captureRegions)
  const captureIntervals = useSettingsStore((s) => s.captureIntervals)
  const setCaptureRegion = useSettingsStore((s) => s.setCaptureRegion)
  const setCaptureInterval = useSettingsStore((s) => s.setCaptureInterval)
  const openRegionSelector = useSettingsStore((s) => s.openRegionSelector)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number; interval: number }>({
    x: 0, y: 0, w: 0, h: 0, interval: DEFAULT_CAPTURE_INTERVAL_MS
  })

  const handleToggle = useCallback(
    (regionId: string) => {
      const region = captureRegions[regionId]
      if (!region) return
      const updated = { ...region, enabled: !region.enabled }
      setCaptureRegion(regionId, updated)
      saveCaptureRegion({
        id: regionId,
        ...updated,
        interval: captureIntervals[regionId] ?? DEFAULT_CAPTURE_INTERVAL_MS
      }).catch(() => {})
    },
    [captureRegions, captureIntervals, setCaptureRegion]
  )

  const startEditing = useCallback((regionId: string) => {
    const region = captureRegions[regionId]
    if (!region) return
    setEditingId(regionId)
    setDraft({
      x: region.x,
      y: region.y,
      w: region.width,
      h: region.height,
      interval: captureIntervals[regionId] ?? DEFAULT_CAPTURE_INTERVAL_MS
    })
  }, [captureRegions, captureIntervals])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const saveEditing = useCallback(() => {
    if (!editingId) return
    const region = captureRegions[editingId]
    if (!region) return

    const updated = {
      ...region,
      x: Math.max(0, draft.x),
      y: Math.max(0, draft.y),
      width: Math.max(1, draft.w),
      height: Math.max(1, draft.h)
    }

    setCaptureRegion(editingId, updated)
    setCaptureInterval(editingId, Math.max(50, draft.interval))

    // Save to IndexedDB
    saveCaptureRegion({
      id: editingId,
      ...updated,
      interval: draft.interval
    }).catch(() => {})

    setEditingId(null)
  }, [editingId, draft, captureRegions, setCaptureRegion, setCaptureInterval])

  const formatInterval = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms}ms`
  }

  return (
    <div>
      {/* Table header */}
      <div className="capture-table-header">
        <span className="capture-col-name">區域</span>
        <span className="capture-col-pos">座標</span>
        <span className="capture-col-size">大小</span>
        <span className="capture-col-interval">間隔</span>
        <span className="capture-col-toggle">啟用</span>
      </div>

      {REGION_ORDER.map((id) => {
        const region = captureRegions[id]
        if (!region) return null
        const interval = captureIntervals[id] ?? DEFAULT_CAPTURE_INTERVAL_MS
        const isEditing = editingId === id

        return (
          <div key={id} className={`capture-region-row ${region.enabled ? '' : 'disabled'}`}>
            <div className="capture-region-main">
              <span className="capture-col-name capture-region-name">
                {REGION_NAMES[id]}
              </span>

              {isEditing ? (
                <>
                  <span className="capture-col-pos">
                    <input
                      type="number"
                      className="capture-input"
                      value={draft.x}
                      onChange={(e) => setDraft((d) => ({ ...d, x: parseInt(e.target.value) || 0 }))}
                    />
                    <span className="capture-input-sep">,</span>
                    <input
                      type="number"
                      className="capture-input"
                      value={draft.y}
                      onChange={(e) => setDraft((d) => ({ ...d, y: parseInt(e.target.value) || 0 }))}
                    />
                  </span>
                  <span className="capture-col-size">
                    <input
                      type="number"
                      className="capture-input"
                      value={draft.w}
                      onChange={(e) => setDraft((d) => ({ ...d, w: parseInt(e.target.value) || 1 }))}
                    />
                    <span className="capture-input-sep">x</span>
                    <input
                      type="number"
                      className="capture-input"
                      value={draft.h}
                      onChange={(e) => setDraft((d) => ({ ...d, h: parseInt(e.target.value) || 1 }))}
                    />
                  </span>
                  <span className="capture-col-interval">
                    <input
                      type="number"
                      className="capture-input capture-input-wide"
                      value={draft.interval}
                      min={50}
                      step={100}
                      onChange={(e) => setDraft((d) => ({ ...d, interval: parseInt(e.target.value) || 100 }))}
                    />
                    <span className="capture-input-unit">ms</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="capture-col-pos capture-region-value">
                    ({region.x}, {region.y})
                  </span>
                  <span className="capture-col-size capture-region-value">
                    {region.width}x{region.height}
                  </span>
                  <span className="capture-col-interval capture-region-value">
                    {formatInterval(interval)}
                  </span>
                </>
              )}

              <span className="capture-col-toggle">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={region.enabled}
                    onChange={() => handleToggle(id)}
                  />
                  <span className="toggle-slider" />
                </label>
              </span>
            </div>

            {/* Edit / Save / Cancel buttons */}
            <div className="capture-region-actions">
              {isEditing ? (
                <>
                  <button className="capture-action-btn save" onClick={saveEditing}>儲存</button>
                  <button className="capture-action-btn cancel" onClick={cancelEditing}>取消</button>
                </>
              ) : (
                <button className="capture-action-btn edit" onClick={() => startEditing(id)}>
                  編輯
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="settings-section" style={{ marginTop: '10px' }}>
        <button className="settings-btn" onClick={openRegionSelector}>
          開啟區域選擇器（拖曳調整）
        </button>
      </div>
    </div>
  )
}
