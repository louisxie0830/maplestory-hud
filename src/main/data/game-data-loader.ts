import { readFile, access } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import log from 'electron-log/main'
import { getUserStore } from './user-data-store'
import type { MapData, MonsterData, BossData, TrainingSpotData } from '../../shared/game-data'

let maps: Record<number, MapData> = {}
let monsters: Record<number, MonsterData> = {}
let bosses: Record<string, BossData> = {}
let trainingSpots: TrainingSpotData[] = []
let trainingSpotsByMapId: Record<number, TrainingSpotData[]> = {}

function getDataPath(): string {
  const source = getUserStore().get('dataSource', { mode: 'bundled', pluginDir: '' })
  if (source.mode === 'plugin' && source.pluginDir) {
    return source.pluginDir
  }
  if (app.isPackaged) {
    return join(process.resourcesPath, 'data')
  }
  return join(app.getAppPath(), 'data')
}

async function canRead(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function loadJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const base = getDataPath()
    const filePath = join(base, filename)
    if (!(await canRead(filePath))) {
      throw new Error(`Missing data file: ${filePath}`)
    }
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    log.warn(`Failed to load ${filename}, using fallback`)
    return fallback
  }
}

/** 載入所有遊戲資料（地圖、怪物、Boss、練功點），並建立索引 */
export async function loadGameData(): Promise<void> {
  const [mapsData, monstersData, bossesData, spotsData] = await Promise.all([
    loadJsonFile<Record<number, MapData>>('maps.json', {}),
    loadJsonFile<Record<number, MonsterData>>('monsters.json', {}),
    loadJsonFile<Record<string, BossData>>('bosses.json', {}),
    loadJsonFile<TrainingSpotData[]>('training-spots.json', [])
  ])

  maps = mapsData
  monsters = monstersData
  bosses = bossesData
  trainingSpots = spotsData

  // Build mapId -> spots index
  trainingSpotsByMapId = {}
  for (const spot of trainingSpots) {
    if (!trainingSpotsByMapId[spot.mapId]) trainingSpotsByMapId[spot.mapId] = []
    trainingSpotsByMapId[spot.mapId].push(spot)
  }

  // Compute levelRange for maps from their monster levels
  for (const map of Object.values(maps)) {
    if (map.levelRange) continue
    const levels = map.monsterIds
      .map((id) => monsters[id]?.level)
      .filter((l): l is number => l !== undefined && l > 0)
    if (levels.length > 0) {
      map.levelRange = [Math.min(...levels), Math.max(...levels)]
    }
  }

  log.info(
    `Game data loaded: ${Object.keys(maps).length} maps, ` +
      `${Object.keys(monsters).length} monsters, ` +
      `${Object.keys(bosses).length} bosses, ` +
      `${trainingSpots.length} training spots, source=${getDataPath()}`
  )
}

/**
 * 根據地圖 ID 取得地圖資訊
 * @param mapId - 地圖 ID
 * @returns 地圖資料，若不存在則回傳 null
 */
export function getMapInfo(mapId: number): MapData | null {
  return maps[mapId] || null
}

/**
 * 以關鍵字搜尋地圖（支援中文名稱、英文名稱及地圖 ID）
 * @param query - 搜尋關鍵字
 * @returns 最多回傳 20 筆符合的地圖資料
 */
export function searchMaps(query: string): MapData[] {
  const lower = query.toLowerCase()
  return Object.values(maps)
    .filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(lower)) ||
        (m.nameEn && m.nameEn.toLowerCase().includes(lower)) ||
        m.id.toString().includes(query)
    )
    .slice(0, 20)
}

/**
 * 根據怪物 ID 取得怪物資訊
 * @param monsterId - 怪物 ID
 * @returns 怪物資料，若不存在則回傳 null
 */
export function getMonsterInfo(monsterId: number): MonsterData | null {
  return monsters[monsterId] || null
}

/**
 * 批次取得多隻怪物的資訊
 * @param monsterIds - 怪物 ID 陣列
 * @returns 對應的怪物資料陣列，不存在的怪物以 null 表示
 */
export function getMonsterInfoBatch(monsterIds: number[]): (MonsterData | null)[] {
  return monsterIds.map((id) => monsters[id] || null)
}

/**
 * 根據角色等級取得適合的練功點，依經驗效率降序排列
 * @param level - 角色等級
 * @returns 符合等級範圍的練功點清單
 */
export function getTrainingSpots(level: number): TrainingSpotData[] {
  return trainingSpots
    .filter((s) => level >= s.levelRange[0] && level <= s.levelRange[1])
    .sort((a, b) => b.expEfficiency - a.expEfficiency)
}

/**
 * 根據地圖 ID 取得該地圖的練功點資訊
 * @param mapId - 地圖 ID
 * @returns 該地圖的練功點清單
 */
export function getTrainingSpotsByMapId(mapId: number): TrainingSpotData[] {
  return trainingSpotsByMapId[mapId] || []
}

/** 取得所有 Boss 資料 */
export function getAllBosses(): BossData[] {
  return Object.values(bosses)
}

export function getCurrentDataSourceInfo(): { mode: 'bundled' | 'plugin'; path: string } {
  const source = getUserStore().get('dataSource', { mode: 'bundled', pluginDir: '' })
  return { mode: source.mode, path: getDataPath() }
}
