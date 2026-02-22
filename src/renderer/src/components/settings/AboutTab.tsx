import React, { useState, useCallback } from 'react'

const FEATURES = [
  {
    title: '角色狀態監控',
    icon: '❤️',
    items: [
      'HP / MP 即時血條顯示（OCR 辨識）',
      'EXP 經驗進度條 + 百分比',
      '每小時經驗效率計算',
      '預估升級剩餘時間'
    ]
  },
  {
    title: '計時器',
    icon: '⏱',
    items: [
      '內建 8 個 BOSS 預設（乂乂坎、粉紅豆、露西亞...）',
      '自訂計時器（名稱 + 分鐘）',
      '到期閃爍提醒',
      '內建日 BOSS（24 小時）與週 BOSS（7 天）時長'
    ]
  },
  {
    title: '地圖資訊',
    icon: '🗺',
    items: [
      '搜尋地圖（中文 / 英文 / ID）',
      '顯示怪物列表、等級、EXP',
      '練功點推薦（依等級篩選）',
      '離線資料庫：13,000+ 地圖、10,000+ 怪物'
    ]
  },
  {
    title: '傷害統計',
    icon: '⚔',
    items: [
      '即時 DPM（每分鐘傷害）',
      '峰值 DPM 記錄',
      '總傷害累計',
      '60 秒即時 Sparkline 圖表',
      'BOSS 擊殺時間估算',
      '匯出傷害記錄（CSV）'
    ]
  },
  {
    title: '螢幕擷取 & OCR',
    icon: '📷',
    items: [
      '自動偵測 MapleStory 視窗（不受其他視窗遮擋）',
      '可自訂擷取區域（座標、大小）',
      '可調整擷取間隔（50ms ~ 60s）',
      'Tesseract.js OCR 引擎（3 workers 平行處理）',
      '圖片預處理：灰階、放大、二值化、銳化',
      'OCR 校準工具：即時預覽辨識結果',
      '偵測不到遊戲視窗自動暫停 + 自動恢復'
    ]
  },
  {
    title: '覆蓋層',
    icon: '🖥',
    items: [
      '全螢幕透明覆蓋，不影響遊戲操作',
      '滑鼠移至 HUD 面板即可操作，移開自動穿透',
      '面板可自由拖曳排列',
      '透明度可調整（20% ~ 100%）'
    ]
  },
  {
    title: 'Log 檢視器',
    icon: '📋',
    items: [
      '系統匣右鍵 →「查看 Log」開啟',
      '即時更新、等級篩選（INFO / WARN / ERROR）',
      '一鍵開啟 Log 檔案所在資料夾'
    ]
  }
]

/** 關於頁面，展示應用程式功能清單、快捷鍵與使用流程 */
export const AboutTab: React.FC = () => {
  const [diagPath, setDiagPath] = useState<string | null>(null)

  const exportDiagnostics = useCallback(async () => {
    const filePath = await window.electronAPI.exportDiagnostics()
    if (filePath) setDiagPath(filePath)
  }, [])

  return (
    <div className="about-tab">
      <div className="about-header">
        <div className="about-title">MapleStory HUD</div>
        <div className="about-version">v0.1.9</div>
        <div className="about-desc">
          楓之谷即時遊戲資訊顯示工具 — 透過螢幕擷取 + OCR 辨識，在遊戲畫面上疊加角色狀態、計時器、地圖資訊與傷害統計。
        </div>
      </div>

      <div className="about-section">
        <div className="about-section-title">
          <span className="about-section-icon">🩺</span>
          診斷工具
        </div>
        <div className="about-actions">
          <button className="settings-btn" onClick={exportDiagnostics}>
            匯出診斷報告（JSON）
          </button>
          {diagPath && <div className="about-note">已匯出：{diagPath}</div>}
        </div>
      </div>

      {FEATURES.map((section) => (
        <div key={section.title} className="about-section">
          <div className="about-section-title">
            <span className="about-section-icon">{section.icon}</span>
            {section.title}
          </div>
          <ul className="about-list">
            {section.items.map((item, i) => (
              <li key={i} className="about-list-item">{item}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="about-section">
        <div className="about-section-title">
          <span className="about-section-icon">⌨</span>
          快捷鍵
        </div>
        <div className="about-shortcut-list">
          <div className="about-shortcut">
            <kbd>F7</kbd>
            <span>啟動 / 暫停擷取</span>
          </div>
          <div className="about-shortcut">
            <kbd>F8</kbd>
            <span>重置統計資料</span>
          </div>
          <div className="about-shortcut">
            <kbd>F9</kbd>
            <span>鎖定 / 解鎖覆蓋層</span>
          </div>
          <div className="about-shortcut">
            <kbd>F10</kbd>
            <span>遊戲截圖（自動存桌面）</span>
          </div>
        </div>
      </div>

      <div className="about-section">
        <div className="about-section-title">
          <span className="about-section-icon">💡</span>
          使用流程
        </div>
        <ol className="about-steps">
          <li>開啟遊戲，進入角色畫面</li>
          <li>到「擷取」分頁，調整各區域的座標和大小以對準遊戲 UI</li>
          <li>到「校準」分頁，點「測試辨識」確認 OCR 結果正確</li>
          <li>鎖定覆蓋層，即可一邊遊戲一邊查看即時資訊</li>
        </ol>
      </div>

    </div>
  )
}
