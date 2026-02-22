import React from 'react'

interface WelcomeStepProps {
  onNext: () => void
}

/** 設定精靈歡迎步驟，介紹應用程式主要功能 */
export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <>
      <div className="wizard-header">
        <div className="wizard-title">MapleStory HUD</div>
        <div className="wizard-subtitle">即時監控你的遊戲數據</div>
      </div>

      <div className="wizard-body">
        <ul className="wizard-feature-list">
          <li className="wizard-feature-item">
            <span className="wizard-feature-icon">&#x2726;</span>
            HP / MP / EXP 即時追蹤
          </li>
          <li className="wizard-feature-item">
            <span className="wizard-feature-icon">&#x2726;</span>
            傷害統計與 DPM 分析
          </li>
          <li className="wizard-feature-item">
            <span className="wizard-feature-icon">&#x2726;</span>
            楓幣收入追蹤
          </li>
          <li className="wizard-feature-item">
            <span className="wizard-feature-icon">&#x2726;</span>
            Boss 計時器
          </li>
        </ul>

        <div className="wizard-hint">
          接下來將引導你完成基本設定，只需要幾個步驟。
        </div>
      </div>

      <div className="wizard-footer">
        <div />
        <button className="settings-btn" onClick={onNext}>下一步</button>
      </div>
    </>
  )
}
