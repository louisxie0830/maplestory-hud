import React from 'react'

interface ToastMessage {
  id: number
  type: 'warning' | 'success'
  text: string
}

interface CaptureToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

/** 擷取狀態通知吐司元件，顯示警告與成功訊息 */
export const CaptureToast: React.FC<CaptureToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'warning' ? '⚠' : '✓'}</span>
          <span className="toast-text">{toast.text}</span>
          {toast.type !== 'warning' && (
            <button className="toast-close" onClick={() => onDismiss(toast.id)}>
              &#10005;
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
