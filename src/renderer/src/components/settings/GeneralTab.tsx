import React, { useState, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settings-store'

const SECTION_NAMES: Record<string, string> = {
  damage: '傷害詳情',
  timers: '計時器',
  map: '地圖'
}

/** 一般設定頁，包含主題切換、透明度、快捷鍵與區塊展開設定 */
export const GeneralTab: React.FC = () => {
  const overlayOpacity = useSettingsStore((s) => s.overlayOpacity)
  const setOverlayOpacity = useSettingsStore((s) => s.setOverlayOpacity)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const sections = useSettingsStore((s) => s.sections)
  const toggleSection = useSettingsStore((s) => s.toggleSection)
  const resetHudPosition = useSettingsStore((s) => s.resetHudPosition)

  const [localOpacity, setLocalOpacity] = useState(overlayOpacity)

  const handleOpacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value)
      setLocalOpacity(val)
      setOverlayOpacity(val)
      window.electronAPI?.setOpacity(val)
    },
    [setOverlayOpacity]
  )

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">主題</div>
        <div className="settings-row">
          <button
            className={`settings-theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            暗色
          </button>
          <button
            className={`settings-theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            亮色
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">覆蓋層透明度</div>
        <div className="settings-row">
          <input
            type="range"
            className="settings-slider"
            min="0.2"
            max="1"
            step="0.05"
            value={localOpacity}
            onChange={handleOpacityChange}
          />
          <span className="settings-value">{Math.round(localOpacity * 100)}%</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">快捷鍵</div>
        <div className="settings-row">
          <span className="stat-label">啟動 / 暫停擷取</span>
          <span className="settings-value">F7</span>
        </div>
        <div className="settings-row">
          <span className="stat-label">重置統計資料</span>
          <span className="settings-value">F8</span>
        </div>
        <div className="settings-row">
          <span className="stat-label">鎖定 / 解鎖覆蓋層</span>
          <span className="settings-value">F9</span>
        </div>
        <div className="settings-row">
          <span className="stat-label">遊戲截圖（存桌面）</span>
          <span className="settings-value">F10</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">區塊預設展開</div>
        {Object.entries(SECTION_NAMES).map(([id, name]) => (
          <div key={id} className="settings-row">
            <span className="stat-label">{name}</span>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={!(sections[id]?.collapsed ?? false)}
                onChange={() => toggleSection(id)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <button className="settings-btn" onClick={resetHudPosition}>
          重置面板位置
        </button>
      </div>
    </div>
  )
}
