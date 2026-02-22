import { create } from 'zustand'

export interface OcrRecentItem {
  id: string
  timestamp: number
  regionId: 'hp' | 'mp' | 'exp' | 'meso'
  valueText: string
  confidence: number
}

interface AnalysisState {
  sessionStartedAt: number
  records: OcrRecentItem[]
  totalCount: number

  addOcrRecord: (item: Omit<OcrRecentItem, 'id'>) => void
  removeRecentRecord: (id: string) => void
  markExpSample: (percent: number, timestamp: number) => void
  resetAnalysis: () => void
}

const MAX_RECENT = 120
const RECENT_WINDOW_MS = 5 * 60 * 1000

/** 統計分析 store：維護 session 與近期 OCR 可刪除資料 */
export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  sessionStartedAt: Date.now(),
  records: [],
  totalCount: 0,

  addOcrRecord: (item) => {
    const now = Date.now()
    const next: OcrRecentItem = {
      ...item,
      id: `${item.regionId}-${item.timestamp}-${Math.random().toString(36).slice(2, 8)}`
    }
    const pruned = get().records
      .filter((r) => now - r.timestamp <= RECENT_WINDOW_MS)
      .concat(next)
      .slice(-MAX_RECENT)
    set((state) => ({
      records: pruned,
      totalCount: state.totalCount + 1
    }))
  },

  removeRecentRecord: (id) => {
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }))
  },

  markExpSample: (_percent, timestamp) => {
    const s = get()
    if (s.sessionStartedAt === 0 || timestamp < s.sessionStartedAt) {
      set({ sessionStartedAt: timestamp })
    }
  },

  resetAnalysis: () => {
    set({
      sessionStartedAt: Date.now(),
      records: [],
      totalCount: 0
    })
  }
}))
