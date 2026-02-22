import { openIDB } from './idb-client'

const DB_NAME = 'maplestory-hud'
const DB_VERSION = 2

const STORES = {
  OCR_HISTORY: 'ocrHistory'
} as const

function openDB(): Promise<IDBDatabase> {
  return openIDB(DB_NAME, DB_VERSION, (db, tx) => {
    // OCR reading history (for trends)
    if (!db.objectStoreNames.contains(STORES.OCR_HISTORY)) {
      const store = db.createObjectStore(STORES.OCR_HISTORY, {
        keyPath: 'id',
        autoIncrement: true
      })
      store.createIndex('regionId', 'regionId', { unique: false })
      store.createIndex('timestamp', 'timestamp', { unique: false })
      store.createIndex('regionId_timestamp', ['regionId', 'timestamp'], { unique: false })
    } else {
      // Upgrade existing store: add compound index if missing
      const store = tx.objectStore(STORES.OCR_HISTORY)
      if (!store.indexNames.contains('regionId_timestamp')) {
        store.createIndex('regionId_timestamp', ['regionId', 'timestamp'], { unique: false })
      }
    }
  })
}

interface OcrHistoryEntry {
  id?: number
  regionId: string
  timestamp: number
  value: unknown
  confidence: number
}

/** 新增一筆 OCR 辨識歷史記錄 */
export async function addOcrHistory(entry: Omit<OcrHistoryEntry, 'id'>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OCR_HISTORY, 'readwrite')
    const store = tx.objectStore(STORES.OCR_HISTORY)
    const request = store.put(entry)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
