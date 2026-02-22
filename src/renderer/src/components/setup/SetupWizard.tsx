import React, { useState, useCallback } from 'react'
import { WelcomeStep } from './WelcomeStep'
import { DetectionStep } from './DetectionStep'
import { VerificationStep } from './VerificationStep'

const STEP_COUNT = 3

interface SetupWizardProps {
  onComplete: () => void
}

/** 首次設定精靈，引導使用者完成歡迎、遊戲偵測與 OCR 驗證步驟 */
export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0)

  const handleClose = useCallback(() => {
    window.electronAPI.quitApp()
  }, [])

  return (
    <div className="wizard-container">
      <div className="wizard-panel">
        <button className="wizard-close" onClick={handleClose} title="關閉">&times;</button>
        {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
        {step === 1 && <DetectionStep onNext={() => setStep(2)} />}
        {step === 2 && <VerificationStep onComplete={onComplete} />}

        <div className="wizard-dots">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <span
              key={i}
              className={`wizard-step-dot${i === step ? ' active' : ''}${i < step ? ' completed' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
