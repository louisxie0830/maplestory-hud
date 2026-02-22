import { create } from 'zustand'
import type { MapData, MonsterData, TrainingSpotData } from '../types/game-data'

interface MapState {
  currentMap: MapData | null
  monsters: MonsterData[]
  trainingSpots: TrainingSpotData[]
  searchResults: MapData[]
  isLoading: boolean

  setCurrentMap: (map: MapData | null) => void
  setMonsters: (monsters: MonsterData[]) => void
  setTrainingSpots: (spots: TrainingSpotData[]) => void
  setSearchResults: (results: MapData[]) => void
  setLoading: (loading: boolean) => void
}

/** 管理當前地圖、怪物、練功地點及搜尋結果 */
export const useMapStore = create<MapState>((set) => ({
  currentMap: null,
  monsters: [],
  trainingSpots: [],
  searchResults: [],
  isLoading: false,

  setCurrentMap: (map) => set({ currentMap: map }),
  setMonsters: (monsters) => set({ monsters }),
  setTrainingSpots: (spots) => set({ trainingSpots: spots }),
  setSearchResults: (results) => set({ searchResults: results }),
  setLoading: (isLoading) => set({ isLoading })
}))
