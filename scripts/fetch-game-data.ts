/**
 * MapleStory Game Data Fetcher (v2 - Optimized)
 * 從 maplestory.io API 抓取怪物和地圖資料
 *
 * 策略:
 * 1. 用 LIST endpoint 取得中文名 (1 request 取代數千個)
 * 2. 先抓地圖詳情，再只抓「出現在地圖上的怪物 + Boss」的詳情
 * 3. 增大 batch size，提高效率
 *
 * Usage: npm run fetch-data
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

// ============================================================
// Config
// ============================================================

const GMS_BASE = 'https://maplestory.io/api/GMS/251'
const CMS_BASE = 'https://maplestory.io/api/CMS/186'
const DATA_DIR = join(__dirname, '..', 'data')

const BATCH_SIZE = 20
const DELAY_MS = 100
const RETRY_DELAY_MS = 2000
const REQUEST_TIMEOUT_MS = 10000

// ============================================================
// Simplified Chinese → Traditional Chinese mapping
// ============================================================

const S2T_MAP: Record<string, string> = {
  '蜗': '蝸', '经': '經', '验': '驗', '险': '險',
  '战': '戰', '斗': '鬥', '剑': '劍', '术': '術',
  '龙': '龍', '凤': '鳳', '灵': '靈', '兽': '獸',
  '鸟': '鳥', '鱼': '魚', '虫': '蟲', '树': '樹',
  '风': '風', '云': '雲', '电': '電',
  '阳': '陽', '阴': '陰',
  '红': '紅', '蓝': '藍', '绿': '綠', '黄': '黃',
  '银': '銀', '铁': '鐵', '铜': '銅', '钢': '鋼',
  '枪': '槍',
  '圣': '聖', '药': '藥',
  '国': '國', '镇': '鎮', '岛': '島',
  '宫': '宮', '庙': '廟',
  '桥': '橋', '门': '門',
  '东': '東',
  '将': '將', '军': '軍', '师': '師',
  '骑': '騎', '侠': '俠', '贼': '賊', '盗': '盜',
  '猎': '獵',
  '头': '頭', '脸': '臉',
  '气': '氣',
  '击': '擊',
  '强': '強', '远': '遠',
  '长': '長',
  '极': '極',
  '飞': '飛',
  '杀': '殺', '灭': '滅',
  '开': '開', '关': '關', '进': '進',
  '里': '裡', '内': '內', '间': '間',
  '时': '時', '钟': '鐘', '号': '號',
  '个': '個', '只': '隻', '条': '條', '张': '張', '块': '塊',
  '层': '層', '级': '級', '阶': '階',
  '机': '機', '车': '車',
  '坏': '壞', '断': '斷',
  '恶': '惡', '义': '義',
  '乐': '樂', '欢': '歡', '爱': '愛',
  '梦': '夢', '虚': '虛', '实': '實',
  '护': '護', '卫': '衛', '锁': '鎖',
  '释': '釋', '唤': '喚',
  '创': '創', '设': '設', '计': '計', '发': '發', '现': '現',
  '寻': '尋', '冲': '衝',
  '传': '傳', '说': '說', '话': '話', '语': '語', '书': '書',
  '记': '記', '忆': '憶',
  '钱': '錢', '币': '幣', '宝': '寶',
  '矿': '礦',
  '叶': '葉',
  '绳': '繩', '线': '線', '丝': '絲', '网': '網', '链': '鏈', '环': '環',
  '带': '帶', '裤': '褲', '铠': '鎧',
  '双': '雙', '单': '單', '对': '對', '组': '組', '队': '隊', '团': '團',
  '会': '會', '帮': '幫',
  '练': '練', '训': '訓', '学': '學', '习': '習',
  '领': '領', '导': '導', '挥': '揮',
  '规': '規', '则': '則',
  '让': '讓', '给': '給', '还': '還',
  '选': '選', '择': '擇', '决': '決',
  '胜': '勝', '负': '負', '赢': '贏', '输': '輸',
  '试': '試', '测': '測', '检': '檢',
  '认': '認', '识': '識', '觉': '覺',
  '应': '應', '该': '該', '须': '須',
  '愿': '願',
  '称': '稱',
  '观': '觀', '视': '視',
  '听': '聽', '闻': '聞', '声': '聲', '响': '響',
  '讲': '講', '谈': '談', '论': '論', '议': '議',
  '读': '讀', '写': '寫', '画': '畫',
  '变': '變', '转': '轉', '换': '換',
  '连': '連', '续': '續',
  '满': '滿',
  '净': '淨', '纯': '純', '杂': '雜',
  '热': '熱', '温': '溫', '凉': '涼',
  '干': '乾', '湿': '濕', '润': '潤',
  '软': '軟', '坚': '堅',
  '轻': '輕',
  '宽': '寬', '广': '廣', '狭': '狹',
  '缓': '緩',
  '难': '難', '简': '簡', '复': '複',
  '丰': '豐', '贫': '貧', '穷': '窮',
  '贵': '貴', '价': '價',
  '质': '質',
  '种': '種', '类': '類', '样': '樣',
  '状': '狀', '态': '態',
  '纹': '紋', '图': '圖',
  '标': '標', '码': '碼',
  '数': '數', '额': '額',
  '终': '終', '尽': '盡',
  '总': '總',
  '点': '點', '体': '體',
  '处': '處', '场': '場', '区': '區',
  '边': '邊', '侧': '側',
  '顶': '頂', '础': '礎',
  '伤': '傷', '损': '損', '毁': '毀',
  '补': '補', '疗': '療', '愈': '癒',
  '胆': '膽', '肾': '腎', '脏': '臟',
  '吗': '嗎',
  '这': '這', '谁': '誰', '么': '麼',
  '几': '幾',
  '从': '從', '过': '過',
  '与': '與', '并': '並',
  '虽': '雖', '却': '卻',
  '为': '為',
  '着': '著',
  '岭': '嶺',
  '滩': '灘', '湾': '灣',
  '园': '園', '庄': '莊', '垒': '壘',
  '废': '廢', '遗': '遺', '迹': '跡',
  '尘': '塵',
  '蝎': '蠍', '蚁': '蟻',
  '鹰': '鷹', '鸦': '鴉', '鶴': '鶴', '鸡': '雞', '鸭': '鴨',
  '狮': '獅',
  '猪': '豬', '马': '馬',
  '猫': '貓',
  '属': '屬', '魂': '魂',
  '异': '異',
  '隐': '隱', '潜': '潛',
  '绝': '絕',
  '罗': '羅', '尔': '爾',
  '亚': '亞', '欧': '歐',
  '历': '歷', '纪': '紀',
  '众': '眾',
  '仅': '僅', '独': '獨',
  '辉': '輝', '闪': '閃', '烁': '爍', '灿': '燦',
  '烧': '燒', '炼': '煉',
  '冻': '凍', '雾': '霧',
  '尸': '屍', '坟': '墳',
  '贪': '貪',
  '噬': '噬', '饮': '飲',
  '织': '織', '编': '編', '缝': '縫',
  '锻': '鍛', '铸': '鑄',
  '采': '採',
  '养': '養',
  '钓': '釣', '渔': '漁',
  '触': '觸',
  '举': '舉',
  '挡': '擋',
  '缠': '纏', '绕': '繞', '围': '圍',
  '脱': '脫', '离': '離',
  '袭': '襲',
  '驱': '驅', '赶': '趕',
  '请': '請', '问': '問', '询': '詢',
  '报': '報',
  '警': '警', '惊': '驚', '惧': '懼',
  '叹': '嘆', '怜': '憐', '悯': '憫',
  '庆': '慶', '贺': '賀', '赞': '讚',
  '谢': '謝',
  '约': '約',
  '仪': '儀', '礼': '禮',
  '运': '運', '缘': '緣',
  '灾': '災', '祸': '禍',
  '罚': '罰', '赏': '賞', '惩': '懲', '奖': '獎',
  '争': '爭', '夺': '奪', '抢': '搶',
  '占': '佔', '据': '據', '拥': '擁',
  '统': '統',
}

function s2t(text: string | null | undefined): string {
  if (!text) return ''
  let result = ''
  for (const char of text) {
    result += S2T_MAP[char] || char
  }
  return result
}

// ============================================================
// HTTP helpers
// ============================================================

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function fetchWithRetry<T>(url: string, retries = 1): Promise<T | null> {
  let result = await fetchJson<T>(url)
  if (result !== null) return result
  for (let i = 0; i < retries; i++) {
    await sleep(RETRY_DELAY_MS)
    result = await fetchJson<T>(url)
    if (result !== null) return result
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ============================================================
// Types
// ============================================================

interface MobListItem {
  id: number
  name: string
  level: number
  isBoss: boolean
}

interface MobDetailRaw {
  id: number
  name: string
  meta?: {
    level?: number
    maxHP?: number
    exp?: number
    isBoss?: boolean
    isBodyAttack?: boolean
    physicalDamage?: number
    magicDamage?: number
  }
  foundAt?: number[]
}

interface MapListItem {
  id: number
  name: string
  streetName: string
}

interface MapDetail {
  name: string
  streetName: string
  isTown: boolean
  mobs: Array<{ id: number }>
}

interface MonsterOutput {
  id: number
  name: string
  nameEn: string
  level: number
  hp: number
  exp: number
  mapIds: number[]
  isBoss: boolean
}

interface MapOutput {
  id: number
  name: string
  nameEn: string
  area: string
  areaEn: string
  monsterIds: number[]
  isTown: boolean
  fieldType: string
}

interface BossOutput {
  id: string
  mobId: number
  name: string
  nameEn: string
  level: number
  hp: number
  respawnType: 'daily' | 'weekly'
  difficulty: string[]
}

interface TrainingSpotOutput {
  mapId: number
  mapName: string
  levelRange: [number, number]
  expEfficiency: number
  notes: string
  tags: string[]
}

// ============================================================
// Batch processing
// ============================================================

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R | null>,
  label: string
): Promise<R[]> {
  const results: R[] = []
  let completed = 0
  let failed = 0

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map((item) => processor(item))
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value !== null) {
        results.push(r.value)
      } else {
        failed++
      }
    }

    completed += batch.length
    const pct = ((completed / items.length) * 100).toFixed(1)
    process.stdout.write(`\r  ${label}: ${completed}/${items.length} (${pct}%) [${results.length} ok, ${failed} skip]`)

    if (i + BATCH_SIZE < items.length) {
      await sleep(DELAY_MS)
    }
  }

  console.log()
  return results
}

// ============================================================
// Main fetch logic
// ============================================================

async function main() {
  console.log('MapleStory Game Data Fetcher v2')
  console.log('================================')
  console.log(`Output: ${DATA_DIR}`)
  const startTime = Date.now()

  // ----------------------------------------------------------
  // Step 1: Fetch ALL lists in parallel (4 requests total)
  // ----------------------------------------------------------
  console.log('\n=== Step 1: Fetching lists (GMS + CMS) ===')

  const [gmsMobList, cmsMobList, gmsMapList, cmsMapList] = await Promise.all([
    fetchJson<MobListItem[]>(`${GMS_BASE}/mob`),
    fetchJson<MobListItem[]>(`${CMS_BASE}/mob`),
    fetchJson<MapListItem[]>(`${GMS_BASE}/map`),
    fetchJson<MapListItem[]>(`${CMS_BASE}/map`),
  ])

  if (!gmsMobList) throw new Error('Failed to fetch GMS mob list')
  if (!gmsMapList) throw new Error('Failed to fetch GMS map list')

  console.log(`  GMS mobs: ${gmsMobList.length}`)
  console.log(`  CMS mobs: ${cmsMobList?.length ?? 'FAILED (will use English names)'}`)
  console.log(`  GMS maps: ${gmsMapList.length}`)
  console.log(`  CMS maps: ${cmsMapList?.length ?? 'FAILED (will use English names)'}`)

  // Build CMS name lookup maps
  const cmsMobNames = new Map<number, string>()
  if (cmsMobList) {
    for (const mob of cmsMobList) {
      cmsMobNames.set(mob.id, s2t(mob.name))
    }
  }

  const cmsMapNames = new Map<number, { name: string; streetName: string }>()
  if (cmsMapList) {
    for (const map of cmsMapList) {
      cmsMapNames.set(map.id, {
        name: s2t(map.name),
        streetName: s2t(map.streetName || '')
      })
    }
  }

  // Build GMS mob basic info lookup
  const gmsMobBasic = new Map<number, MobListItem>()
  for (const mob of gmsMobList) {
    gmsMobBasic.set(mob.id, mob)
  }

  // ----------------------------------------------------------
  // Step 2: Fetch map details (GMS only)
  // ----------------------------------------------------------
  console.log('\n=== Step 2: Fetching map details ===')

  const maps: Record<number, MapOutput> = {}
  const allMapMobIds = new Set<number>()

  const mapResults = await processBatch(
    gmsMapList,
    async (map) => {
      const detail = await fetchWithRetry<MapDetail>(`${GMS_BASE}/map/${map.id}`)
      if (!detail) return null

      const monsterIds = [...new Set((detail.mobs || []).map((m) => m.id))]
      const cms = cmsMapNames.get(map.id)

      return {
        id: map.id,
        name: cms?.name || map.name,
        nameEn: detail.name || map.name,
        area: cms?.streetName || map.streetName,
        areaEn: detail.streetName || map.streetName,
        monsterIds,
        isTown: detail.isTown || false,
        fieldType: detail.isTown ? 'town' : 'normal'
      } as MapOutput
    },
    'Maps'
  )

  for (const m of mapResults) {
    maps[m.id] = m
    for (const mobId of m.monsterIds) {
      allMapMobIds.add(mobId)
    }
  }
  console.log(`  Maps fetched: ${Object.keys(maps).length}`)
  console.log(`  Unique mobs on maps: ${allMapMobIds.size}`)

  // ----------------------------------------------------------
  // Step 3: Fetch monster details (only mobs on maps + bosses)
  // ----------------------------------------------------------
  console.log('\n=== Step 3: Fetching monster details ===')

  // Determine which mobs need detail fetching
  const mobsNeedingDetail: MobListItem[] = gmsMobList.filter(
    (mob) => allMapMobIds.has(mob.id) || mob.isBoss
  )
  console.log(`  Mobs needing details: ${mobsNeedingDetail.length} (from ${gmsMobList.length} total)`)

  const monsters: Record<number, MonsterOutput> = {}

  // First, add ALL mobs from the list with basic info (no HP/EXP)
  for (const mob of gmsMobList) {
    monsters[mob.id] = {
      id: mob.id,
      name: cmsMobNames.get(mob.id) || mob.name,
      nameEn: mob.name,
      level: mob.level,
      hp: 0,
      exp: 0,
      mapIds: [],
      isBoss: mob.isBoss
    }
  }

  // Then, fetch details for the subset that needs it
  const mobResults = await processBatch(
    mobsNeedingDetail,
    async (mob) => {
      const detail = await fetchWithRetry<MobDetailRaw>(`${GMS_BASE}/mob/${mob.id}`)
      if (!detail) return null

      const meta = detail.meta || {}
      return {
        id: mob.id,
        name: cmsMobNames.get(mob.id) || mob.name,
        nameEn: detail.name || mob.name,
        level: meta.level || mob.level || 0,
        hp: meta.maxHP || 0,
        exp: meta.exp || 0,
        mapIds: detail.foundAt || [],
        isBoss: meta.isBoss || mob.isBoss
      } as MonsterOutput
    },
    'Monster details'
  )

  // Overwrite with detailed data
  for (const m of mobResults) {
    monsters[m.id] = m
  }

  console.log(`  Total monsters: ${Object.keys(monsters).length}`)
  console.log(`  With details: ${mobResults.length}`)

  // ----------------------------------------------------------
  // Step 4: Generate boss data
  // ----------------------------------------------------------
  console.log('\n=== Step 4: Generating boss data ===')

  const weeklyBossIds = new Set([
    8860000, 8850011, 8800102, 8840000, 8910100,
    2600607, 2630608, 2631607, 2635607, 2636607, 2637607, 2642607, 2643607,
  ])

  const bosses: Record<string, BossOutput> = {}
  for (const mob of Object.values(monsters)) {
    if (!mob.isBoss) continue
    if (mob.level < 50) continue

    const key = mob.nameEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!key) continue

    bosses[key] = {
      id: key,
      mobId: mob.id,
      name: mob.name,
      nameEn: mob.nameEn,
      level: mob.level,
      hp: mob.hp,
      respawnType: weeklyBossIds.has(mob.id) ? 'weekly' : 'daily',
      difficulty: ['normal']
    }
  }
  console.log(`  Boss entries: ${Object.keys(bosses).length}`)

  // ----------------------------------------------------------
  // Step 5: Generate training spots
  // ----------------------------------------------------------
  console.log('\n=== Step 5: Generating training spots ===')

  const spots: TrainingSpotOutput[] = []

  for (const map of Object.values(maps)) {
    if (map.isTown || map.monsterIds.length === 0) continue

    const mobLevels = map.monsterIds
      .map((id) => monsters[id]?.level)
      .filter((l): l is number => l !== undefined && l > 0)

    if (mobLevels.length === 0) continue

    const minLevel = Math.min(...mobLevels)
    const maxLevel = Math.max(...mobLevels)

    const avgExp = map.monsterIds
      .map((id) => monsters[id]?.exp || 0)
      .reduce((sum, exp) => sum + exp, 0) / map.monsterIds.length

    const density = map.monsterIds.length
    const efficiency = Math.min(10, Math.round((density * avgExp) / 10000) + 1)
    if (efficiency < 3) continue

    const tags: string[] = []
    if (density >= 10) tags.push('high-density')
    if (avgExp > 50000) tags.push('high-exp')
    if (minLevel >= 200) tags.push('endgame')

    spots.push({
      mapId: map.id,
      mapName: map.name,
      levelRange: [Math.max(1, minLevel - 10), maxLevel + 10],
      expEfficiency: efficiency,
      notes: `${map.area} - ${density} 隻怪物, 平均 EXP ${Math.round(avgExp).toLocaleString()}`,
      tags
    })
  }

  spots.sort((a, b) => a.levelRange[0] - b.levelRange[0] || b.expEfficiency - a.expEfficiency)
  console.log(`  Training spots: ${spots.length}`)

  // ----------------------------------------------------------
  // Step 6: Write output files
  // ----------------------------------------------------------
  console.log('\n=== Step 6: Writing files ===')

  writeFileSync(join(DATA_DIR, 'monsters.json'), JSON.stringify(monsters, null, 2), 'utf-8')
  console.log(`  monsters.json: ${Object.keys(monsters).length} entries`)

  writeFileSync(join(DATA_DIR, 'maps.json'), JSON.stringify(maps, null, 2), 'utf-8')
  console.log(`  maps.json: ${Object.keys(maps).length} entries`)

  writeFileSync(join(DATA_DIR, 'bosses.json'), JSON.stringify(bosses, null, 2), 'utf-8')
  console.log(`  bosses.json: ${Object.keys(bosses).length} entries`)

  writeFileSync(join(DATA_DIR, 'training-spots.json'), JSON.stringify(spots, null, 2), 'utf-8')
  console.log(`  training-spots.json: ${spots.length} entries`)

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\nDone! Total time: ${elapsed} minutes`)
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
