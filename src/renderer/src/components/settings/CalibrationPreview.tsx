import React from 'react'
import type { CalibrationResult } from '../../types/settings'

interface CalibrationPreviewProps {
  result: CalibrationResult
  threshold: number
}

/** 校準預覽元件，顯示原始擷取、預處理影像與辨識信心度 */
export const CalibrationPreview: React.FC<CalibrationPreviewProps> = ({
  result,
  threshold
}) => {
  const confidencePercent = (result.confidence * 100).toFixed(1)
  const isGood = result.confidence >= threshold

  return (
    <div className="calibration-preview">
      <div className="calibration-images">
        <div className="calibration-image-box">
          <div className="calibration-image-label">原始擷取</div>
          <img
            src={`data:image/png;base64,${result.rawImage}`}
            alt="Raw capture"
          />
        </div>
        <div className="calibration-image-box">
          <div className="calibration-image-label">預處理後</div>
          <img
            src={`data:image/png;base64,${result.processedImage}`}
            alt="Processed"
          />
        </div>
      </div>

      <div className="settings-row">
        <span className="stat-label">辨識文字</span>
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
          {result.text || '(無)'}
        </span>
      </div>

      <div className="settings-row">
        <span className="stat-label">信心度</span>
        <span style={{ color: isGood ? 'var(--color-success)' : 'var(--color-error)' }}>
          {confidencePercent}%
        </span>
      </div>

      <div className="wizard-confidence-bar" style={{ marginTop: '4px' }}>
        <div
          className="wizard-confidence-fill"
          style={{
            width: `${Math.min(100, result.confidence * 100)}%`,
            background: isGood ? 'var(--color-success)' : 'var(--color-error)'
          }}
        />
      </div>
    </div>
  )
}
