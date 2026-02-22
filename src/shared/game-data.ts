/** 地圖資料 */
export interface MapData {
  id: number
  name: string
  nameEn: string
  area: string
  areaEn: string
  monsterIds: number[]
  isTown: boolean
  fieldType: string
  levelRange?: [number, number]
}

/** 怪物資料 */
export interface MonsterData {
  id: number
  name: string
  nameEn: string
  level: number
  hp: number
  exp: number
  mapIds: number[]
  isBoss: boolean
}

/** 頭目資料 */
export interface BossData {
  id: string
  mobId: number
  name: string
  nameEn: string
  level: number
  hp: number
  respawnType: 'daily' | 'weekly'
  difficulty: string[]
}

/** 練功地點資料 */
export interface TrainingSpotData {
  mapId: number
  mapName: string
  levelRange: [number, number]
  expEfficiency: number
  notes: string
  tags: string[]
}

/** 計時器設定 */
export interface TimerConfig {
  id: string
  name: string
  type: 'boss' | 'potion' | 'custom' | 'event'
  durationMs: number
  recurring: boolean
  alertSound: boolean
  bossId?: string
  startedAt?: number
}
