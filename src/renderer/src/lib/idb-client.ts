/** 共用 IndexedDB 連線快取——每個資料庫名稱僅保留一個連線 */

const instances = new Map<string, IDBDatabase>()

/** 開啟（或從快取取得）IndexedDB 連線，並在版本升級時執行 onUpgrade 回呼 */
export function openIDB(
  name: string,
  version: number,
  onUpgrade: (db: IDBDatabase, tx: IDBTransaction) => void
): Promise<IDBDatabase> {
  const cached = instances.get(name)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)

    request.onupgradeneeded = () => {
      onUpgrade(request.result, request.transaction!)
    }

    request.onsuccess = () => {
      const db = request.result
      instances.set(name, db)
      db.onclose = () => { instances.delete(name) }
      db.onerror = () => { instances.delete(name) }
      resolve(db)
    }
    request.onerror = () => reject(request.error)
  })
}
