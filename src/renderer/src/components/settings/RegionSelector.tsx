import React, { useState, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { RegionHandle } from './RegionHandle'
import type { Rect } from '../../hooks/useResizable'
import type { CaptureRegion } from '../../types/settings'

const REGION_COLORS: Record<string, string> = {
  hp: '#ff4444',
  mp: '#4488ff',
  exp: '#ffdd44',
  damage: '#44dd88',
  meso: '#ff8844',
  mapName: '#cc88ff'
}

/** 擷取區域選擇器，以全螢幕覆蓋層方式拖曳調整各擷取區域 */
export const RegionSelector: React.FC = () => {
  const captureRegions = useSettingsStore((s) => s.captureRegions)
  const setCaptureRegion = useSettingsStore((s) => s.setCaptureRegion)
  const closeRegionSelector = useSettingsStore((s) => s.closeRegionSelector)

  // Local copy for editing
  const [localRegions, setLocalRegions] = useState<Record<string, CaptureRegion>>({
    ...captureRegions
  })

  const handleRectChange = useCallback((regionId: string, rect: Rect) => {
    setLocalRegions((prev) => ({
      ...prev,
      [regionId]: {
        ...prev[regionId],
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    }))
  }, [])

  const handleApply = useCallback(() => {
    for (const [id, region] of Object.entries(localRegions)) {
      if (
        region.x !== captureRegions[id]?.x ||
        region.y !== captureRegions[id]?.y ||
        region.width !== captureRegions[id]?.width ||
        region.height !== captureRegions[id]?.height
      ) {
        setCaptureRegion(id, region)
      }
    }
    closeRegionSelector()
  }, [localRegions, captureRegions, setCaptureRegion, closeRegionSelector])

  const handleCancel = useCallback(() => {
    closeRegionSelector()
  }, [closeRegionSelector])

  return (
    <div className="region-selector-overlay">
      {/* Control bar */}
      <div className="region-selector-controls">
        <div className="region-selector-title-wrap">
          <span className="region-selector-title">區域校準模式</span>
          <span className="region-selector-subtitle">拖動框內可移動，拖動四角圓點可縮放</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="settings-btn" onClick={handleApply}>
            套用
          </button>
          <button
            className="settings-btn"
            style={{ background: 'var(--bg-subtle)' }}
            onClick={handleCancel}
          >
            取消
          </button>
        </div>
      </div>

      {/* Region handles */}
      {Object.entries(localRegions)
        .filter(([, r]) => r.enabled)
        .map(([id, region]) => (
          <RegionHandle
            key={id}
            regionId={id}
            initialRect={{ x: region.x, y: region.y, width: region.width, height: region.height }}
            color={REGION_COLORS[id] || '#ffffff'}
            onRectChange={(rect) => handleRectChange(id, rect)}
          />
        ))}
    </div>
  )
}
