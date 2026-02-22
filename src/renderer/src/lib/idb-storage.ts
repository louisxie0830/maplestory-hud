import type { StateStorage } from 'zustand/middleware'
import { openIDB } from './idb-client'

const DB_NAME = 'maplestory-hud-zustand'
const DB_VERSION = 1
const STORE_NAME = 'zustand'

function openDB(): Promise<IDBDatabase> {
  return openIDB(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME)
    }
  })
}

/** 基於 IndexedDB 的 Zustand 持久化儲存介面，取代預設的 localStorage */
export const idbStorage: StateStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  },

  setItem: async (key: string, value: string): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(value, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  },

  removeItem: async (key: string): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}
