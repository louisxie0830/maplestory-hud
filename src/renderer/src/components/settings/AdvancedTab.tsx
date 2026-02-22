import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'

interface OcrHealthRow {
  regionId: string
  total: number
  success: number
  failed: number
  successRate: number
  avgLatencyMs: number
  avgConfidence: number
}

type SectionId =
  | 'ops'
  | 'settings'
  | 'profiles'
  | 'layout'
  | 'performance'
  | 'accessibility'
  | 'hotkeys'
  | 'data'
  | 'ocr-health'
  | 'ocr-replay'
  | 'calibration'
  | 'observability'
  | 'events'
  | 'feedback'

interface SectionMeta {
  id: SectionId
  title: string
  keywords: string[]
}

const SECTIONS: SectionMeta[] = [
  { id: 'ops', title: '更新與維運', keywords: ['update', 'release', 'diagnostics', 'crash'] },
  { id: 'settings', title: '設定檔管理', keywords: ['settings', 'import', 'export', 'wizard'] },
  { id: 'profiles', title: 'Profile 系統', keywords: ['profile', 'save', 'load'] },
  { id: 'layout', title: 'HUD 佈局模板', keywords: ['layout', 'template', 'boss', 'grind'] },
  { id: 'performance', title: '效能模式', keywords: ['performance', 'fps', 'power'] },
  { id: 'accessibility', title: '可及性與語系', keywords: ['font', 'contrast', 'locale', 'language'] },
  { id: 'hotkeys', title: '快捷鍵與衝突檢查', keywords: ['hotkey', 'conflict', 'shortcut'] },
  { id: 'data', title: '資料來源插件', keywords: ['plugin', 'data source', 'manifest'] },
  { id: 'ocr-health', title: 'OCR 健康監控', keywords: ['ocr', 'health', 'confidence', 'latency'] },
  { id: 'ocr-replay', title: 'OCR 回放測試集', keywords: ['replay', 'dataset', 'qa'] },
  { id: 'calibration', title: '校準自動建議', keywords: ['calibration', 'suggestions'] },
  { id: 'observability', title: '觀測面板 v2', keywords: ['runtime', 'cpu', 'memory'] },
  { id: 'events', title: '事件中心', keywords: ['events', 'logs'] },
  { id: 'feedback', title: '回饋閉環', keywords: ['feedback', 'report'] }
]

export const AdvancedTab: React.FC = () => {
  const applyLayoutTemplate = useSettingsStore((s) => s.applyLayoutTemplate)
  const performanceMode = useSettingsStore((s) => s.performanceMode)
  const setPerformanceMode = useSettingsStore((s) => s.setPerformanceMode)
  const accessibility = useSettingsStore((s) => s.accessibility)
  const setAccessibility = useSettingsStore((s) => s.setAccessibility)
  const locale = useSettingsStore((s) => s.locale)
  const setLocale = useSettingsStore((s) => s.setLocale)
  const hotkeys = useSettingsStore((s) => s.hotkeys)
  const setHotkeys = useSettingsStore((s) => s.setHotkeys)
  const loadFullSettings = useSettingsStore((s) => s.loadFullSettings)

  const [hotkeyDraft, setHotkeyDraft] = useState(hotkeys)
  const [hotkeyHint, setHotkeyHint] = useState<string>('')
  const [dataSourceMode, setDataSourceMode] = useState<'bundled' | 'plugin'>('bundled')
  const [pluginDir, setPluginDir] = useState('')
  const [ocrHealth, setOcrHealth] = useState<OcrHealthRow[]>([])
  const [updateMessage, setUpdateMessage] = useState('')
  const [profileName, setProfileName] = useState('default')
  const [profiles, setProfiles] = useState<string[]>([])
  const [replayFiles, setReplayFiles] = useState<string[]>([])
  const [selectedReplay, setSelectedReplay] = useState('')
  const [replayResult, setReplayResult] = useState<string>('')
  const [updateChannel, setUpdateChannel] = useState<'stable' | 'beta'>('stable')
  const [runtimeLine, setRuntimeLine] = useState('')
  const [eventRows, setEventRows] = useState<Array<{ id: number; message: string; level: string; category: string }>>([])
  const [feedbackNote, setFeedbackNote] = useState('')
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    ops: true,
    settings: true,
    profiles: false,
    layout: false,
    performance: false,
    accessibility: false,
    hotkeys: false,
    data: false,
    'ocr-health': false,
    'ocr-replay': false,
    calibration: false,
    observability: false,
    events: false,
    feedback: false
  })

  const ocrHealthText = useMemo(() => (ocrHealth.length === 0 ? '尚無 OCR 統計資料' : ''), [ocrHealth.length])

  const isVisible = useCallback((id: SectionId) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    const section = SECTIONS.find((s) => s.id === id)
    if (!section) return true
    return section.title.toLowerCase().includes(q) || section.keywords.some((k) => k.includes(q))
  }, [filter])

  const toggleSection = useCallback((id: SectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const refreshOcrHealth = useCallback(async () => {
    const rows = await window.electronAPI.getOcrHealth()
    setOcrHealth(rows as OcrHealthRow[])
  }, [])

  const handleCheckUpdate = useCallback(async () => {
    const result = await window.electronAPI.checkForUpdates()
    if (!result) {
      setUpdateMessage('更新檢查失敗')
      return
    }
    setUpdateMessage(result.hasUpdate
      ? `有新版本 v${result.latestVersion}（目前 v${result.currentVersion}）`
      : `已是最新版本 v${result.currentVersion}`)
  }, [])

  const applyHotkeys = useCallback(async () => {
    const result = await setHotkeys(hotkeyDraft)
    setHotkeyHint(result.ok ? '快捷鍵已更新' : `衝突：${result.conflicts.join(', ')}`)
  }, [hotkeyDraft, setHotkeys])

  const applyDataSource = useCallback(async () => {
    await window.electronAPI.updateSettings({ dataSource: { mode: dataSourceMode, pluginDir: pluginDir.trim() } })
  }, [dataSourceMode, pluginDir])

  const refreshProfiles = useCallback(async () => {
    const names = await window.electronAPI.listProfiles()
    setProfiles(names)
  }, [])

  const refreshReplayFiles = useCallback(async () => {
    const files = await window.electronAPI.listOcrReplayDatasets()
    setReplayFiles(files)
    if (files.length > 0) setSelectedReplay((prev) => prev || files[0])
  }, [])

  const refreshRuntime = useCallback(async () => {
    const rt = await window.electronAPI.getRuntimeHealth()
    setRuntimeLine(`CPU ${rt.cpuPercentApprox}% / RSS ${rt.memoryRssMb}MB / OCR ${rt.ocrFpsApprox} fps`)
  }, [])

  const refreshEvents = useCallback(async () => {
    const rows = await window.electronAPI.getRecentEvents(20)
    setEventRows(rows.map((r) => ({ id: r.id, message: r.message, level: r.level, category: r.category })))
  }, [])

  const importSettings = useCallback(async () => {
    const imported = await window.electronAPI.importSettings()
    if (imported) loadFullSettings(imported)
  }, [loadFullSettings])

  useEffect(() => { setHotkeyDraft(hotkeys) }, [hotkeys])

  useEffect(() => {
    void refreshOcrHealth()
    void refreshProfiles()
    void refreshReplayFiles()
    void refreshRuntime()
    void refreshEvents()
    void window.electronAPI.getUpdateChannel().then((ch) => setUpdateChannel(ch))
    void window.electronAPI.getSettingsKey('dataSource').then((raw) => {
      const v = (raw as { mode?: 'bundled' | 'plugin'; pluginDir?: string }) || {}
      setDataSourceMode(v.mode === 'plugin' ? 'plugin' : 'bundled')
      setPluginDir(v.pluginDir ?? '')
    })
  }, [refreshOcrHealth, refreshProfiles, refreshReplayFiles, refreshRuntime, refreshEvents])

  const Section: React.FC<{ id: SectionId; children: React.ReactNode }> = ({ id, children }) => {
    if (!isVisible(id)) return null
    const meta = SECTIONS.find((s) => s.id === id)
    if (!meta) return null
    const open = expanded[id]
    return (
      <div className="settings-section">
        <button className="settings-section-toggle" onClick={() => toggleSection(id)}>
          <span>{meta.title}</span>
          <span>{open ? '−' : '+'}</span>
        </button>
        {open && <div className="settings-section-body">{children}</div>}
      </div>
    )
  }

  return (
    <div>
      <div className="settings-section">
        <div className="settings-row">
          <input
            className="settings-input"
            placeholder="搜尋功能，例如 update / profile / hotkey"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="settings-btn" onClick={() => setExpanded((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, true])) as Record<SectionId, boolean>)}>全部展開</button>
          <button className="settings-btn" onClick={() => setExpanded((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, false])) as Record<SectionId, boolean>)}>全部收合</button>
        </div>
      </div>

      <Section id="ops">
        <div className="settings-row">
          <button className="settings-btn" onClick={handleCheckUpdate}>檢查更新</button>
          <select className="settings-select" value={updateChannel} onChange={async (e) => {
            const channel = e.target.value as 'stable' | 'beta'
            setUpdateChannel(channel)
            await window.electronAPI.setUpdateChannel(channel)
          }}>
            <option value="stable">穩定版</option>
            <option value="beta">測試版</option>
          </select>
          <button className="settings-btn" onClick={() => window.electronAPI.openRollbackUrl()}>回滾到上一版</button>
          <button className="settings-btn" onClick={() => window.electronAPI.exportDiagnostics()}>匯出診斷</button>
          <button className="settings-btn" onClick={() => window.electronAPI.exportLatestCrashReport()}>匯出最近 Crash</button>
        </div>
        {updateMessage && <div className="about-note">{updateMessage}</div>}
      </Section>

      <Section id="settings">
        <div className="settings-row">
          <button className="settings-btn" onClick={() => window.electronAPI.exportSettings()}>匯出設定</button>
          <button className="settings-btn" onClick={importSettings}>匯入設定</button>
          <button className="settings-btn danger" onClick={async () => {
            await window.electronAPI.resetSetup()
            window.location.reload()
          }}>重新執行設定精靈</button>
        </div>
      </Section>

      <Section id="profiles">
        <div className="settings-row">
          <input className="settings-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          <button className="settings-btn" onClick={async () => { await window.electronAPI.saveProfile(profileName); await refreshProfiles() }}>儲存</button>
          <button className="settings-btn" onClick={async () => {
            const loaded = await window.electronAPI.loadProfile(profileName)
            if (loaded) loadFullSettings(loaded)
          }}>載入</button>
          <button className="settings-btn danger" onClick={async () => { await window.electronAPI.deleteProfile(profileName); await refreshProfiles() }}>刪除</button>
        </div>
        <div className="about-note">現有：{profiles.join(', ') || '無'}</div>
      </Section>

      <Section id="layout">
        <div className="settings-row">
          <button className="settings-btn" onClick={() => applyLayoutTemplate('minimal')}>最小化</button>
          <button className="settings-btn" onClick={() => applyLayoutTemplate('boss')}>打王</button>
          <button className="settings-btn" onClick={() => applyLayoutTemplate('grind')}>練功</button>
        </div>
      </Section>

      <Section id="performance">
        <div className="settings-row">
          <select className="settings-select" value={performanceMode} onChange={(e) => setPerformanceMode(e.target.value as 'balanced' | 'performance' | 'power-saver')}>
            <option value="performance">高更新率</option>
            <option value="balanced">平衡</option>
            <option value="power-saver">省電</option>
          </select>
        </div>
      </Section>

      <Section id="accessibility">
        <div className="settings-row">
          <span className="stat-label">字體比例</span>
          <input
            type="range"
            className="settings-slider"
            min="0.85"
            max="1.35"
            step="0.05"
            value={accessibility.fontScale}
            onChange={(e) => setAccessibility({ fontScale: parseFloat(e.target.value) })}
          />
          <span className="settings-value">{Math.round(accessibility.fontScale * 100)}%</span>
        </div>
        <div className="settings-row">
          <span className="stat-label">高對比模式</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={accessibility.highContrast} onChange={(e) => setAccessibility({ highContrast: e.target.checked })} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-row">
          <span className="stat-label">語系</span>
          <select className="settings-select" value={locale} onChange={(e) => setLocale(e.target.value as 'zh-TW' | 'en')}>
            <option value="zh-TW">繁體中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </Section>

      <Section id="hotkeys">
        {(['toggleCapture', 'resetStats', 'toggleLock', 'screenshot'] as const).map((key) => (
          <div key={key} className="settings-row">
            <span className="stat-label">{key}</span>
            <input className="settings-input" value={hotkeyDraft[key]} onChange={(e) => setHotkeyDraft((prev) => ({ ...prev, [key]: e.target.value }))} />
          </div>
        ))}
        <div className="settings-row">
          <button className="settings-btn" onClick={applyHotkeys}>套用快捷鍵</button>
          {hotkeyHint && <span className="settings-value">{hotkeyHint}</span>}
        </div>
      </Section>

      <Section id="data">
        <div className="settings-row">
          <select className="settings-select" value={dataSourceMode} onChange={(e) => setDataSourceMode(e.target.value as 'bundled' | 'plugin')}>
            <option value="bundled">內建資料</option>
            <option value="plugin">外部資料夾</option>
          </select>
        </div>
        <div className="settings-row">
          <input className="settings-input" placeholder="plugin data folder" value={pluginDir} onChange={(e) => setPluginDir(e.target.value)} />
          <button className="settings-btn" onClick={applyDataSource}>套用資料來源</button>
        </div>
      </Section>

      <Section id="ocr-health">
        <div className="settings-row">
          <button className="settings-btn" onClick={refreshOcrHealth}>重新整理</button>
          <button className="settings-btn" onClick={() => window.electronAPI.resetOcrHealth()}>重置統計</button>
        </div>
        {ocrHealthText && <div className="about-note">{ocrHealthText}</div>}
        {ocrHealth.map((row) => (
          <div key={row.regionId} className="settings-row">
            <span className="stat-label">{row.regionId}</span>
            <span className="settings-value">{Math.round(row.successRate * 100)}% / {Math.round(row.avgLatencyMs)}ms / conf {row.avgConfidence.toFixed(2)}</span>
          </div>
        ))}
      </Section>

      <Section id="ocr-replay">
        <div className="settings-row">
          <select className="settings-select" value={selectedReplay} onChange={(e) => setSelectedReplay(e.target.value)}>
            {replayFiles.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button className="settings-btn" onClick={async () => {
            const file = selectedReplay
            if (!file) return
            const res = await window.electronAPI.runOcrReplayDataset(file)
            if (!res) return
            setReplayResult(`${res.dataset}: ${res.passed}/${res.total} (${Math.round(res.accuracy * 100)}%)`)
          }}>執行回放</button>
          <button className="settings-btn" onClick={refreshReplayFiles}>重整清單</button>
        </div>
        {replayResult && <div className="about-note">{replayResult}</div>}
      </Section>

      <Section id="calibration">
        <div className="settings-row">
          <button className="settings-btn" onClick={async () => {
            const suggestions = await window.electronAPI.getCalibrationSuggestions()
            if (suggestions.length === 0) {
              setReplayResult('目前沒有可用建議')
              return
            }
            await window.electronAPI.applyCalibrationSuggestions(suggestions)
            const settings = await window.electronAPI.getSettings()
            loadFullSettings(settings)
            setReplayResult(`已套用 ${suggestions.length} 個校準建議`)
          }}>一鍵套用建議</button>
        </div>
      </Section>

      <Section id="observability">
        <div className="settings-row">
          <button className="settings-btn" onClick={refreshRuntime}>刷新 runtime</button>
          <span className="settings-value">{runtimeLine}</span>
        </div>
      </Section>

      <Section id="events">
        <div className="settings-row">
          <button className="settings-btn" onClick={refreshEvents}>刷新事件</button>
          <button className="settings-btn danger" onClick={async () => { await window.electronAPI.clearEvents(); await refreshEvents() }}>清空事件</button>
        </div>
        {eventRows.map((row) => (
          <div key={row.id} className="settings-row">
            <span className="stat-label">[{row.level}] {row.category}</span>
            <span className="settings-value">{row.message}</span>
          </div>
        ))}
      </Section>

      <Section id="feedback">
        <div className="settings-row">
          <input className="settings-input" placeholder="回報描述（可選）" value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} />
          <button className="settings-btn" onClick={() => window.electronAPI.exportFeedbackReport(feedbackNote)}>匯出回饋包</button>
        </div>
      </Section>
    </div>
  )
}
