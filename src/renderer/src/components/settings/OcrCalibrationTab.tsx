import React, { useState, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { CalibrationPreview } from './CalibrationPreview'
import type { CalibrationResult } from '../../types/settings'

const REGION_OPTIONS = [
  { id: 'hp', label: 'HP 血量' },
  { id: 'mp', label: 'MP 魔力' },
  { id: 'exp', label: 'EXP 經驗' },
  { id: 'damage', label: '傷害數字' },
  { id: 'mapName', label: '地圖名稱' }
]

/** OCR 校準設定頁，測試辨識結果並調整信心度、二值化等參數 */
export const OcrCalibrationTab: React.FC = () => {
  const ocrSettings = useSettingsStore((s) => s.ocrSettings)
  const setOcrSettings = useSettingsStore((s) => s.setOcrSettings)

  const [selectedRegion, setSelectedRegion] = useState('hp')
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [result, setResult] = useState<CalibrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCalibrate = useCallback(async () => {
    setIsCalibrating(true)
    setError(null)
    setResult(null)

    try {
      const res = await window.electronAPI.calibrateRegion(selectedRegion)
      if (res) {
        setResult(res)
      } else {
        setError('無法擷取該區域，請確認區域設定')
      }
    } catch {
      setError('校準失敗')
    } finally {
      setIsCalibrating(false)
    }
  }, [selectedRegion])

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">選擇區域</div>
        <div className="settings-row">
          <select
            className="settings-select"
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value)
              setResult(null)
            }}
          >
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="settings-btn"
            onClick={handleCalibrate}
            disabled={isCalibrating}
          >
            {isCalibrating ? '擷取中...' : '測試辨識'}
          </button>
        </div>
      </div>

      {result && (
        <div className="settings-section">
          <CalibrationPreview
            result={result}
            threshold={ocrSettings.confidenceThreshold}
          />
        </div>
      )}

      {error && (
        <div className="settings-section" style={{ color: 'var(--color-error)', fontSize: '12px' }}>
          {error}
        </div>
      )}

      <div className="settings-section">
        <div className="settings-section-title">OCR 參數</div>

        <div className="settings-row">
          <span className="stat-label">信心度閾值</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="range"
              className="settings-slider"
              style={{ width: '100px' }}
              min="0"
              max="1"
              step="0.05"
              value={ocrSettings.confidenceThreshold}
              onChange={(e) =>
                setOcrSettings({ confidenceThreshold: parseFloat(e.target.value) })
              }
            />
            <span className="settings-value" style={{ width: '36px' }}>
              {(ocrSettings.confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="stat-label">二值化閾值</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="range"
              className="settings-slider"
              style={{ width: '100px' }}
              min="0"
              max="255"
              step="5"
              value={ocrSettings.preprocessThreshold}
              onChange={(e) =>
                setOcrSettings({ preprocessThreshold: parseInt(e.target.value) })
              }
            />
            <span className="settings-value" style={{ width: '36px' }}>
              {ocrSettings.preprocessThreshold}
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="stat-label">反轉色彩</span>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={ocrSettings.preprocessInvert}
              onChange={(e) => setOcrSettings({ preprocessInvert: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  )
}
