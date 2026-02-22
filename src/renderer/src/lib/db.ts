import { openIDB } from './idb-client'

const DB_NAME = 'maplestory-hud'
const DB_VERSION = 2

/** IndexedDB 物件存放區名稱常數 */
export const STORES = {
  CAPTURE_REGIONS: 'captureRegions',
  OCR_HISTORY: 'ocrHistory'
} as const

function openDB(): Promise<IDBDatabase> {
  return openIDB(DB_NAME, DB_VERSION, (db, tx) => {
    // Capture region configs
    if (!db.objectStoreNames.contains(STORES.CAPTURE_REGIONS)) {
      db.createObjectStore(STORES.CAPTURE_REGIONS, { keyPath: 'id' })
    }

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

/** 從指定物件存放區依 key 取得單筆資料 */
export async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}

/** 將資料寫入指定物件存放區（新增或更新） */
export async function dbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/** 取得指定物件存放區的所有資料 */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

/** 從指定物件存放區依 key 刪除單筆資料 */
export async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/** OCR 歷史記錄項目 */
export interface OcrHistoryEntry {
  id?: number
  regionId: string
  timestamp: number
  value: unknown
  confidence: number
}

/** 新增一筆 OCR 辨識歷史記錄 */
export async function addOcrHistory(entry: Omit<OcrHistoryEntry, 'id'>): Promise<void> {
  await dbPut(STORES.OCR_HISTORY, entry)
}

/** 依區域 ID 取得最近的 OCR 歷史記錄，使用複合索引 [regionId, timestamp] 倒序查詢 */
export async function getOcrHistory(
  regionId: string,
  limit = 100
): Promise<OcrHistoryEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OCR_HISTORY, 'readonly')
    const store = tx.objectStore(STORES.OCR_HISTORY)
    const index = store.index('regionId_timestamp')
    // Range: all entries for this regionId, any timestamp
    const range = IDBKeyRange.bound([regionId, 0], [regionId, Infinity])
    const request = index.openCursor(range, 'prev')
    const results: OcrHistoryEntry[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor && results.length < limit) {
        results.push(cursor.value as OcrHistoryEntry)
        cursor.continue()
      } else {
        resolve(results.reverse())
      }
    }
    request.onerror = () => reject(request.error)
  })
}

/** 擷取區域設定（儲存於 IndexedDB） */
export interface CaptureRegionConfig {
  id: string
  x: number
  y: number
  width: number
  height: number
  enabled: boolean
  interval: number
}

/** 將擷取區域設定儲存至 IndexedDB */
export async function saveCaptureRegion(config: CaptureRegionConfig): Promise<void> {
  await dbPut(STORES.CAPTURE_REGIONS, config)
}

/** 從 IndexedDB 載入所有擷取區域設定 */
export async function loadCaptureRegions(): Promise<CaptureRegionConfig[]> {
  return dbGetAll<CaptureRegionConfig>(STORES.CAPTURE_REGIONS)
}
