import React from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { GeneralTab } from './GeneralTab'
import { CaptureTab } from './CaptureTab'
import { OcrCalibrationTab } from './OcrCalibrationTab'
import { AboutTab } from './AboutTab'
import { AdvancedTab } from './AdvancedTab'
import { t } from '../../lib/i18n'

type Tab = 'general' | 'capture' | 'calibration' | 'advanced' | 'about'

const TABS: { id: Tab; key: string }[] = [
  { id: 'general', key: 'general' },
  { id: 'capture', key: 'capture' },
  { id: 'calibration', key: 'calibration' },
  { id: 'advanced', key: 'advanced' },
  { id: 'about', key: 'about' }
]

/** 設定視窗，以分頁方式呈現一般、擷取、校準與說明設定 */
export const SettingsModal: React.FC = () => {
  const closeSettings = useSettingsStore((s) => s.closeSettings)
  const settingsTab = useSettingsStore((s) => s.settingsTab)
  const setSettingsTab = useSettingsStore((s) => s.setSettingsTab)
  const locale = useSettingsStore((s) => s.locale)

  return (
    <div className="settings-overlay" onClick={closeSettings}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>{t(locale, 'settings')}</span>
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
              {t(locale, tab.key)}
            </button>
          ))}
        </div>
        <div className="settings-content">
          {settingsTab === 'general' && <GeneralTab />}
          {settingsTab === 'capture' && <CaptureTab />}
          {settingsTab === 'calibration' && <OcrCalibrationTab />}
          {settingsTab === 'advanced' && <AdvancedTab />}
          {settingsTab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}
