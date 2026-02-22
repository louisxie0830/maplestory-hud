import React from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { GeneralTab } from './GeneralTab'
import { CaptureTab } from './CaptureTab'
import { OcrCalibrationTab } from './OcrCalibrationTab'
import { AboutTab } from './AboutTab'

type Tab = 'general' | 'capture' | 'calibration' | 'about'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: '一般' },
  { id: 'capture', label: '擷取' },
  { id: 'calibration', label: '校準' },
  { id: 'about', label: '說明' }
]

/** 設定視窗，以分頁方式呈現一般、擷取、校準與說明設定 */
export const SettingsModal: React.FC = () => {
  const closeSettings = useSettingsStore((s) => s.closeSettings)
  const settingsTab = useSettingsStore((s) => s.settingsTab)
  const setSettingsTab = useSettingsStore((s) => s.setSettingsTab)

  return (
    <div className="settings-overlay" onClick={closeSettings}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>設定</span>
          <button className="settings-close-btn" onClick={closeSettings}>
            &#10005;
          </button>
        </div>
        <div className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={settingsTab === tab.id ? 'active' : ''}
              onClick={() => setSettingsTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="settings-content">
          {settingsTab === 'general' && <GeneralTab />}
          {settingsTab === 'capture' && <CaptureTab />}
          {settingsTab === 'calibration' && <OcrCalibrationTab />}
          {settingsTab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}
