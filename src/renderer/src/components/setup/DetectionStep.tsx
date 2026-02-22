import React, { useState, useCallback } from 'react'

type DetectionStatus = 'idle' | 'detecting' | 'found' | 'notFound'

interface DetectionStepProps {
  onNext: () => void
}

/** 遊戲偵測步驟，搜尋 MapleStory 視窗並顯示螢幕解析度資訊 */
export const DetectionStep: React.FC<DetectionStepProps> = ({ onNext }) => {
  const [status, setStatus] = useState<DetectionStatus>('idle')
  const [screenInfo, setScreenInfo] = useState<{ width: number; height: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleDetect = useCallback(async () => {
    setStatus('detecting')
    setPreview(null)
    try {
      const found = await window.electronAPI.checkGameWindow()
      if (found) {
        setStatus('found')
        const info = await window.electronAPI.getScreenInfo()
        setScreenInfo(info)
        // Try to preview the HP region
        try {
          const img = await window.electronAPI.previewRegion('hp')
          if (img) setPreview(img)
        } catch { /* ignore preview failure */ }
      } else {
        setStatus('notFound')
      }
    } catch {
      setStatus('notFound')
    }
  }, [])

  const is1080p = screenInfo && screenInfo.width === 1920 && screenInfo.height === 1080

  return (
    <>
      <div className="wizard-header">
        <div className="wizard-title">偵測遊戲視窗</div>
        <div className="wizard-subtitle">請先啟動新楓之谷，然後按下方按鈕</div>
      </div>

      <div className="wizard-body">
        <button
          className="settings-btn"
          style={{ width: '100%', padding: '8px 14px' }}
          onClick={handleDetect}
          disabled={status === 'detecting'}
        >
          {status === 'detecting' ? '偵測中...' : '偵測遊戲視窗'}
        </button>

        {status === 'detecting' && (
          <div className="wizard-status detecting">
            <span className="wizard-spinner" />
            正在搜尋遊戲視窗...
          </div>
        )}

        {status === 'found' && (
          <>
            <div className="wizard-status success">
              &#x2713; 遊戲視窗已偵測到
            </div>
            {screenInfo && (
              <div className="wizard-info-row">
                <span>螢幕解析度</span>
                <span>{screenInfo.width} &times; {screenInfo.height}</span>
              </div>
            )}
            {is1080p ? (
              <div className="wizard-status success">
                已自動套用預設擷取區域
              </div>
            ) : (
              <div className="wizard-status warning">
                您的解析度非 1920&times;1080，建議完成設定後至「擷取」頁手動校準區域
              </div>
            )}
            {preview && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  HP 區域預覽
                </div>
                <img
                  className="wizard-preview-image"
                  src={`data:image/png;base64,${preview}`}
                  alt="HP region preview"
                />
              </div>
            )}
          </>
        )}

        {status === 'notFound' && (
          <div className="wizard-status error">
            &#x2717; 找不到遊戲視窗，請確認新楓之谷已啟動
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <div />
        <button
          className="settings-btn"
          onClick={onNext}
          disabled={status !== 'found'}
        >
          下一步
        </button>
      </div>
    </>
  )
}
