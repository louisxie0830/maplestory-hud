import React, { useState, useCallback } from 'react'
import { DEFAULT_OCR_CONFIDENCE } from '../../../../shared/constants'

interface CalibrationResult {
  rawImage: string
  processedImage: string
  text: string
  confidence: number
  regionId: string
}

interface VerificationStepProps {
  onComplete: () => void
}

/** OCR 驗證步驟，測試 HP 區域辨識結果並完成首次設定 */
export const VerificationStep: React.FC<VerificationStepProps> = ({ onComplete }) => {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<CalibrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  const handleTest = useCallback(async () => {
    setIsTesting(true)
    setError(null)
    setResult(null)
    try {
      const res = await window.electronAPI.calibrateRegion('hp')
      if (res) {
        setResult(res)
      } else {
        setError('無法擷取 HP 區域，請確認遊戲視窗仍在前景')
      }
    } catch {
      setError('測試失敗')
    } finally {
      setIsTesting(false)
    }
  }, [])

  const handleComplete = useCallback(async () => {
    setCompleting(true)
    try {
      await window.electronAPI.completeSetup()
      onComplete()
    } catch {
      setCompleting(false)
    }
  }, [onComplete])

  const confidence = result ? result.confidence : 0
  const confidencePercent = (confidence * 100).toFixed(1)
  const isGood = confidence >= DEFAULT_OCR_CONFIDENCE

  return (
    <>
      <div className="wizard-header">
        <div className="wizard-title">驗證 OCR 辨識</div>
        <div className="wizard-subtitle">測試擷取區域是否正確（可跳過）</div>
      </div>

      <div className="wizard-body">
        <button
          className="settings-btn"
          style={{ width: '100%', padding: '8px 14px' }}
          onClick={handleTest}
          disabled={isTesting}
        >
          {isTesting ? '辨識中...' : '測試辨識 HP'}
        </button>

        {result && (
          <div style={{ marginTop: '10px' }}>
            <div className="calibration-images">
              <div className="calibration-image-box">
                <div className="calibration-image-label">原始擷取</div>
                <img src={`data:image/png;base64,${result.rawImage}`} alt="Raw" />
              </div>
              <div className="calibration-image-box">
                <div className="calibration-image-label">預處理後</div>
                <img src={`data:image/png;base64,${result.processedImage}`} alt="Processed" />
              </div>
            </div>

            <div className="wizard-info-row" style={{ marginTop: '6px' }}>
              <span>辨識文字</span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {result.text || '(無)'}
              </span>
            </div>

            <div className="wizard-info-row">
              <span>信心度</span>
              <span style={{ color: isGood ? 'var(--color-success)' : 'var(--color-error)' }}>
                {confidencePercent}%
              </span>
            </div>

            <div className="wizard-confidence-bar">
              <div
                className="wizard-confidence-fill"
                style={{
                  width: `${Math.min(100, confidence * 100)}%`,
                  background: isGood
                    ? 'var(--color-success)'
                    : 'var(--color-error)'
                }}
              />
            </div>

            {isGood ? (
              <div className="wizard-status success">&#x2713; 辨識成功！</div>
            ) : (
              <div className="wizard-status warning">
                辨識信心度較低，可稍後在設定 &gt; 校準中調整
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="wizard-status error" style={{ marginTop: '8px' }}>
            {error}
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <div />
        <button
          className="settings-btn"
          onClick={handleComplete}
          disabled={completing}
        >
          {completing ? '啟動中...' : '完成設定'}
        </button>
      </div>
    </>
  )
}
