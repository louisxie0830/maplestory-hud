import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useMapStore } from '../../stores/map-store'
import type { MapData, MonsterData } from '../../types/game-data'

const MOB_ICON_URL = 'https://maplestory.io/api/GMS/251/mob'
const MAP_MINIMAP_URL = 'https://maplestory.io/api/GMS/251/map'

/** Module-level cache for monster data — static data that never changes during a session */
const monsterCache = new Map<number, MonsterData>()

/** 地圖資訊面板，提供地圖搜尋、怪物列表與練功點推薦 */
export const MapInfo: React.FC = () => {
  const currentMap = useMapStore((s) => s.currentMap)
  const monsters = useMapStore((s) => s.monsters)
  const trainingSpots = useMapStore((s) => s.trainingSpots)
  const searchResults = useMapStore((s) => s.searchResults)
  const setSearchResults = useMapStore((s) => s.setSearchResults)
  const setCurrentMap = useMapStore((s) => s.setCurrentMap)
  const setMonsters = useMapStore((s) => s.setMonsters)
  const setTrainingSpots = useMapStore((s) => s.setTrainingSpots)
  const isLoading = useMapStore((s) => s.isLoading)
  const setLoading = useMapStore((s) => s.setLoading)

  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const searchIdRef = useRef(0)
  const selectIdRef = useRef(0)

  // Cleanup debounce timer on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const id = ++searchIdRef.current
    if (q.length < 2) { setSearchResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await window.electronAPI.searchMaps(q)
        if (id === searchIdRef.current) setSearchResults(results)
      } catch { /* ignore */ }
    }, 200)
  }, [setSearchResults])

  const selectMap = useCallback(async (map: MapData) => {
    const id = ++selectIdRef.current
    setCurrentMap(map)
    setSearchResults([])
    setQuery('')
    setLoading(true)

    try {
      // Load monster data — batch IPC with cache
      if (map.monsterIds && map.monsterIds.length > 0) {
        const ids = map.monsterIds.slice(0, 10)
        const uncachedIds = ids.filter((mid) => !monsterCache.has(mid))

        if (uncachedIds.length > 0) {
          const results = await window.electronAPI.getMonstersBatch(uncachedIds)
          for (const m of results) {
            if (m) monsterCache.set(m.id, m)
          }
        }

        if (id !== selectIdRef.current) { setMonsters([]); setTrainingSpots([]); setLoading(false); return }
        setMonsters(ids.map((mid) => monsterCache.get(mid)).filter((m): m is MonsterData => m !== undefined))
      } else {
        setMonsters([])
      }

      // Load training spots by mapId directly
      const spots = await window.electronAPI.getTrainingSpotsByMapId(map.id)
      if (id !== selectIdRef.current) { setMonsters([]); setTrainingSpots([]); setLoading(false); return }
      setTrainingSpots(spots)
    } catch {
      /* ignore */
    } finally {
      if (id === selectIdRef.current) setLoading(false)
    }
  }, [setCurrentMap, setSearchResults, setMonsters, setTrainingSpots, setLoading])

  return (
    <div className="hud-map">
      <input
        className="hud-input full"
        type="text"
        placeholder="搜尋地圖..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {searchResults.length > 0 && (
        <div className="hud-map-results">
          {searchResults.map((m) => (
            <button key={m.id} className="hud-map-result" onClick={() => selectMap(m)}>
              <span>{m.name || m.nameEn}</span>
              {m.levelRange && <span className="hud-muted">Lv.{m.levelRange[0]}-{m.levelRange[1]}</span>}
            </button>
          ))}
        </div>
      )}

      {currentMap ? (
        <div className="hud-map-info">
          {/* Minimap preview */}
          {!currentMap.isTown && (
            <img
              className="hud-minimap"
              src={`${MAP_MINIMAP_URL}/${currentMap.id}/minimap`}
              alt="minimap"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
            />
          )}

          <div className="hud-row">
            <span className="hud-stat-label">地圖</span>
            <span className="hud-stat-value">{currentMap.name || currentMap.nameEn}</span>
          </div>
          {currentMap.area && (
            <div className="hud-row">
              <span className="hud-stat-label">區域</span>
              <span className="hud-stat-value">{currentMap.area || currentMap.areaEn}</span>
            </div>
          )}
          {currentMap.levelRange && (
            <div className="hud-row">
              <span className="hud-stat-label">等級</span>
              <span className="hud-stat-value">Lv.{currentMap.levelRange[0]}-{currentMap.levelRange[1]}</span>
            </div>
          )}

          {isLoading && <div className="hud-empty">載入中...</div>}

          {!isLoading && monsters.length > 0 && (
            <div className="hud-monsters">
              {monsters.map((m) => (
                <div key={m.id} className="hud-monster-row">
                  <img
                    className="hud-mob-icon"
                    src={`${MOB_ICON_URL}/${m.id}/icon`}
                    alt={m.name}
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                  />
                  <span className="hud-monster-name">{m.name || m.nameEn} Lv.{m.level}</span>
                  <span className="hud-monster-exp">EXP {m.exp.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {!isLoading && trainingSpots.length > 0 && (
            <div className="hud-training-note">{trainingSpots[0].notes}</div>
          )}
        </div>
      ) : (
        <div className="hud-empty">搜尋或選擇地圖</div>
      )}
    </div>
  )
}
