import React, { useState, useCallback, useEffect } from 'react'

type DetectionStatus = 'idle' | 'loading' | 'ready' | 'applying' | 'selected' | 'error'

interface GameWindowOption {
  id: string
  name: string
  isGameCandidate: boolean
}

interface DetectionStepProps {
  onNext: () => void
}

/** 遊戲視窗選擇步驟，讓使用者手動指定要擷取的視窗 */
export const DetectionStep: React.FC<DetectionStepProps> = ({ onNext }) => {
  const [status, setStatus] = useState<DetectionStatus>('idle')
  const [options, setOptions] = useState<GameWindowOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [screenInfo, setScreenInfo] = useState<{ width: number; height: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')

  const refreshWindows = useCallback(async () => {
    setStatus('loading')
    setPreview(null)
    try {
      const [wins, selected] = await Promise.all([
        window.electronAPI.listGameWindows(),
        window.electronAPI.getSelectedGameWindow()
      ])
      setOptions(wins)
      if (selected?.sourceId && wins.some((w) => w.id === selected.sourceId)) {
        setSelectedId(selected.sourceId)
        setSelectedName(selected.windowName)
      } else if (wins.length > 0) {
        setSelectedId(wins[0].id)
      } else {
        setSelectedId('')
      }
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void refreshWindows()
  }, [refreshWindows])

  const handleApply = useCallback(async () => {
    if (!selectedId) return
    setStatus('applying')
    setPreview(null)
    try {
      const selected = await window.electronAPI.selectGameWindow(selectedId)
      if (!selected) {
        setStatus('error')
        return
      }
      setSelectedName(selected.windowName)
      const info = await window.electronAPI.getScreenInfo()
      setScreenInfo(info)
      try {
        const img = await window.electronAPI.previewRegion('hp')
        if (img) setPreview(img)
      } catch {
        // Ignore preview error; selection itself already succeeded.
      }
      setStatus('selected')
    } catch {
      setStatus('error')
    }
  }, [selectedId])

  const is1080p = screenInfo && screenInfo.width === 1920 && screenInfo.height === 1080

  return (
    <>
      <div className="wizard-header">
        <div className="wizard-title">選擇遊戲視窗</div>
        <div className="wizard-subtitle">請從清單選擇你要擷取的新楓之谷視窗</div>
      </div>

      <div className="wizard-body">
        <div className="wizard-info-row" style={{ gap: '8px' }}>
          <select
            className="settings-select"
            style={{ width: '100%' }}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={status === 'loading' || status === 'applying' || options.length === 0}
          >
            {options.length === 0 && <option value="">找不到可選擇的視窗</option>}
            {options.map((w) => (
              <option key={w.id} value={w.id}>
                {w.isGameCandidate ? '[Maple] ' : ''}{w.name}
              </option>
            ))}
          </select>
          <button className="settings-btn" onClick={refreshWindows} disabled={status === 'loading' || status === 'applying'}>
            重新整理
          </button>
        </div>

        {status === 'loading' && (
          <div className="wizard-status detecting">
            <span className="wizard-spinner" />
            正在讀取視窗清單...
          </div>
        )}

        <button
          className="settings-btn"
          style={{ width: '100%', padding: '8px 14px', marginTop: '8px' }}
          onClick={handleApply}
          disabled={!selectedId || status === 'loading' || status === 'applying'}
        >
          {status === 'applying' ? '套用中...' : '套用此視窗並測試'}
        </button>

        {status === 'selected' && (
          <>
            <div className="wizard-status success">
              &#x2713; 已選擇：{selectedName}
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
                  HP 區域預覽（來自所選視窗）
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

        {status === 'error' && (
          <div className="wizard-status error">
            &#x2717; 套用失敗，請重新整理視窗清單後再試一次
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <div />
        <button
          className="settings-btn"
          onClick={onNext}
          disabled={status !== 'selected'}
        >
          下一步
        </button>
      </div>
    </>
  )
}
