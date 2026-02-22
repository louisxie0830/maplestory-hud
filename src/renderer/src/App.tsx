import React, { useEffect, useState, useCallback, useRef } from 'react'
import { HudPanel } from './components/HudPanel'
import { useCharacterStore } from './stores/character-store'
import { useSettingsStore } from './stores/settings-store'
import { useAnalysisStore } from './stores/analysis-store'
import { addOcrHistory } from './lib/db'
import type { HpMpResult, ExpResult /* , MesoResult */ } from './types/ocr-result'


interface ToastMessage {
  id: number
  type: 'warning' | 'success'
  text: string
}

let toastId = 0

/** 應用程式根元件：直接進入主 HUD 控制台 */
const App: React.FC = () => {
  const setExp = useCharacterStore((s) => s.setExp)
  // const setMeso = useCharacterStore((s) => s.setMeso)
  const isCaptureRunning = useSettingsStore((s) => s.isCaptureRunning)
  const addOcrRecord = useAnalysisStore((s) => s.addOcrRecord)
  const markExpSample = useAnalysisStore((s) => s.markExpSample)

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastTimers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const weakWarnAtRef = useRef<Record<string, number>>({})

  useEffect(() => () => {
    for (const t of toastTimers.current) clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isCaptureRunning) {
      setToasts((prev) => prev.filter((t) => t.type !== 'warning'))
    }
  }, [isCaptureRunning])

  const addToast = useCallback((type: 'warning' | 'success', text: string) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, type, text }])
    if (type === 'success') {
      const timer = setTimeout(() => {
        toastTimers.current.delete(timer)
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
      toastTimers.current.add(timer)
    }
  }, [])

  const clearWarnings = useCallback(() => {
    setToasts((prev) => prev.filter((t) => t.type !== 'warning'))
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const api = window.electronAPI
    const cleanups: Array<() => void> = []

    cleanups.push(api.onOcrResult('hp', (data) => {
      const result = data as { data: HpMpResult }
      if (result.data) {
        const payload = data as { confidence?: number; timestamp?: number }
        const at = payload.timestamp || Date.now()
        const conf = typeof payload.confidence === 'number' ? payload.confidence : 0
        addOcrRecord({
          regionId: 'hp',
          timestamp: at,
          confidence: conf,
          valueText: `${result.data.current}/${result.data.max}`
        })
        void addOcrHistory({
          regionId: 'hp',
          timestamp: at,
          confidence: conf,
          value: result.data.current
        }).catch(() => {})
      }
    }))

    cleanups.push(api.onOcrResult('mp', (data) => {
      const result = data as { data: HpMpResult }
      if (result.data) {
        const payload = data as { confidence?: number; timestamp?: number }
        const at = payload.timestamp || Date.now()
        const conf = typeof payload.confidence === 'number' ? payload.confidence : 0
        addOcrRecord({
          regionId: 'mp',
          timestamp: at,
          confidence: conf,
          valueText: `${result.data.current}/${result.data.max}`
        })
        void addOcrHistory({
          regionId: 'mp',
          timestamp: at,
          confidence: conf,
          value: result.data.current
        }).catch(() => {})
      }
    }))

    cleanups.push(api.onOcrResult('exp', (data) => {
      const result = data as { data: ExpResult }
      if (result.data) {
        setExp(result.data.percent, result.data.rawValue)
        const payload = data as { confidence?: number; timestamp?: number }
        const at = payload.timestamp || Date.now()
        const conf = typeof payload.confidence === 'number' ? payload.confidence : 0
        markExpSample(result.data.percent, at)
        const expValueText = typeof result.data.rawValue === 'number'
          ? `${result.data.percent.toFixed(2)}% (${result.data.rawValue.toLocaleString()})`
          : `${result.data.percent.toFixed(2)}%`
        addOcrRecord({
          regionId: 'exp',
          timestamp: at,
          confidence: conf,
          valueText: expValueText
        })
        void addOcrHistory({
          regionId: 'exp',
          timestamp: at,
          confidence: conf,
          value: result.data.percent
        }).catch(() => {})
      }
    }))

    // [meso disabled] cleanups.push(api.onOcrResult('meso', ...))
    // cleanups.push(api.onOcrResult('meso', (data) => {
    //   const result = data as { data: MesoResult }
    //   if (result.data) {
    //     setMeso(result.data.amount)
    //     const payload = data as { confidence?: number; timestamp?: number }
    //     const at = payload.timestamp || Date.now()
    //     const conf = typeof payload.confidence === 'number' ? payload.confidence : 0
    //     addOcrRecord({
    //       regionId: 'meso',
    //       timestamp: at,
    //       confidence: conf,
    //       valueText: result.data.amount.toLocaleString()
    //     })
    //     void addOcrHistory({
    //       regionId: 'meso',
    //       timestamp: at,
    //       confidence: conf,
    //       value: result.data.amount
    //     }).catch(() => {})
    //   }
    // }))

    cleanups.push(api.onCaptureAutoPaused(() => {
      useSettingsStore.getState().setCaptureRunning(false)
      addToast('warning', '找不到遊戲視窗，擷取已暫停')
    }))

    cleanups.push(api.onCaptureAutoResumed(() => {
      useSettingsStore.getState().setCaptureRunning(true)
      clearWarnings()
      addToast('success', '遊戲視窗偵測到，擷取已恢復')
    }))

    cleanups.push(api.onCaptureToggled((running) => {
      useSettingsStore.getState().setCaptureRunning(running)
      addToast('success', running ? '擷取已啟動 (F7)' : '擷取已暫停 (F7)')
    }))

    cleanups.push(api.onCaptureOcrWeak(({ regionId }) => {
      const now = Date.now()
      const last = weakWarnAtRef.current[regionId] ?? 0
      if (now - last < 15000) return
      weakWarnAtRef.current[regionId] = now
      const labelMap: Record<string, string> = {
        hp: 'HP',
        mp: 'MP',
        exp: 'EXP',
        // meso: '楓幣',
        // mapName: '地圖'
      }
      const label = labelMap[regionId] || regionId
      addToast('warning', `${label} OCR 連續讀不到，請重選視窗或校準區域`)
    }))

    api.getSettings().then((settings) => {
      useSettingsStore.getState().loadFullSettings(settings)
    })

    api.getCaptureRunning().then((running) => {
      useSettingsStore.getState().setCaptureRunning(running)
    })

    return () => { cleanups.forEach((c) => c()) }
  }, [setExp, /* setMeso, */ addToast, clearWarnings, addOcrRecord, markExpSample])

  return <HudPanel toasts={toasts} onDismissToast={dismissToast} />
}

export default App
