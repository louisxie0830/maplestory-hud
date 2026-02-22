import { desktopCapturer, screen } from 'electron'
import log from 'electron-log/main'
import { GAME_WINDOW_NAMES } from '../../shared/constants'

export interface CaptureRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface CaptureScreenResult {
  image: Electron.NativeImage
  gameWindowFound: boolean
}

export interface SelectableWindowSource {
  id: string
  name: string
  isGameCandidate: boolean
}

const SYSTEM_WINDOW_PATTERNS: RegExp[] = [
  /^(program manager|task switching|windows shell experience|search)$/i,
  /^electron$/i
]

function isSystemUtilityWindow(name: string): boolean {
  const n = name.trim()
  if (!n) return true
  return SYSTEM_WINDOW_PATTERNS.some((re) => re.test(n))
}

/** Cached screen capture with TTL to avoid redundant full-screen grabs */
let captureCache: {
  image: Electron.NativeImage
  gameWindowFound: boolean
  timestamp: number
} | null = null

const CACHE_TTL_MS = 100

let preferredWindowSourceId: string | null = null
let preferredWindowName: string | null = null

/** Throttle "no source found" warnings to avoid log spam on high-frequency capture path */
let lastNoSourceWarn = 0

/** In-flight promise deduplication — prevents parallel desktopCapturer calls */
let inFlightCapture: Promise<CaptureScreenResult | null> | null = null
let hudAnchorCache: {
  width: number
  height: number
  at: number
  regions: Partial<Record<'hp' | 'mp' | 'exp', CaptureRegion>>
} | null = null
let lastAnchorLogAt = 0

/** 設定使用者指定的首選擷取視窗（依 source id，並保留名稱作為 fallback） */
export function setPreferredCaptureWindow(sourceId: string | null, windowName?: string): void {
  preferredWindowSourceId = sourceId?.trim() || null
  preferredWindowName = windowName?.trim() || null
  captureCache = null
}

/** 列出可供使用者選擇的視窗來源，MapleStory 候選會排在前方 */
export async function listSelectableWindows(): Promise<SelectableWindowSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1, height: 1 }
  })
  return sources
    .filter((s) => !isSystemUtilityWindow(s.name))
    .map((s) => ({
      id: s.id,
      name: s.name,
      // Accept image windows as simulated game sources for OCR testing.
      isGameCandidate: GAME_WINDOW_NAMES.some((n) => s.name.includes(n)) || /\.(jpg|jpeg|png|webp|bmp)$/i.test(s.name)
    }))
    .sort((a, b) => {
      if (a.isGameCandidate && !b.isGameCandidate) return -1
      if (!a.isGameCandidate && b.isGameCandidate) return 1
      return a.name.localeCompare(b.name)
    })
}

/** 擷取整個螢幕畫面，優先尋找遊戲視窗，並透過快取與去重避免重複擷取 */
export async function captureScreen(): Promise<CaptureScreenResult | null> {
  const now = Date.now()
  if (captureCache && (now - captureCache.timestamp) < CACHE_TTL_MS) {
    return { image: captureCache.image, gameWindowFound: captureCache.gameWindowFound }
  }

  // If another call is already in progress, wait for it instead of starting a new one
  if (inFlightCapture) return inFlightCapture

  inFlightCapture = captureScreenImpl()
  try {
    return await inFlightCapture
  } finally {
    inFlightCapture = null
  }
}

async function captureScreenImpl(): Promise<CaptureScreenResult | null> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size

    // Phase 1: Search window sources only — captures window content independently
    // of overlapping windows (not affected by other windows on top)
    const windowSources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width, height }
    })

    const preferredById = preferredWindowSourceId
      ? windowSources.find((s) => s.id === preferredWindowSourceId)
      : undefined
    const preferredByName = !preferredById && preferredWindowName
      ? windowSources.find((s) => s.name === preferredWindowName)
      : undefined
    const autoGameSource = windowSources.find(
      (s) => GAME_WINDOW_NAMES.some((n) => s.name.includes(n))
    )
    const gameSource = preferredById || preferredByName || autoGameSource

    if (gameSource) {
      captureCache = { image: gameSource.thumbnail, gameWindowFound: true, timestamp: Date.now() }
      return { image: gameSource.thumbnail, gameWindowFound: true }
    }

    // Phase 2: Fallback to full screen capture
    const screenSources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    })

    const screenSource = screenSources.find((s) =>
      s.id === 'screen:0:0' ||
      s.name === 'Entire Screen' ||
      s.name === 'Screen 1' ||
      s.name === '整個螢幕' ||
      s.name === '整个屏幕' ||
      s.name.startsWith('Screen') ||
      s.name.startsWith('螢幕') ||
      s.name.startsWith('屏幕')
    )

    if (!screenSource) {
      const now = Date.now()
      if (now - lastNoSourceWarn > 5000) {
        log.warn('No capture source found')
        lastNoSourceWarn = now
      }
      captureCache = null
      return null
    }

    captureCache = { image: screenSource.thumbnail, gameWindowFound: false, timestamp: Date.now() }
    return { image: screenSource.thumbnail, gameWindowFound: false }
  } catch (error) {
    log.error('Screen capture failed:', error)
    captureCache = null
    return null
  }
}

/**
 * 裁切圖片中的指定區域
 * @param image - 原始螢幕截圖
 * @param region - 要裁切的區域座標與尺寸
 * @returns 裁切後的圖片
 */
export function cropRegion(
  image: Electron.NativeImage,
  region: CaptureRegion
): Electron.NativeImage {
  const imgSize = image.getSize()
  const x = Math.max(0, Math.round(region.x))
  const y = Math.max(0, Math.round(region.y))
  const width = Math.min(Math.round(region.width), imgSize.width - x)
  const height = Math.min(Math.round(region.height), imgSize.height - y)
  if (width <= 0 || height <= 0) return image
  return image.crop({ x, y, width, height })
}

function clampRegion(region: CaptureRegion, image: Electron.NativeImage): CaptureRegion {
  const size = image.getSize()
  const x = Math.max(0, Math.min(size.width - 1, Math.round(region.x)))
  const y = Math.max(0, Math.min(size.height - 1, Math.round(region.y)))
  const width = Math.max(1, Math.min(size.width - x, Math.round(region.width)))
  const height = Math.max(1, Math.min(size.height - y, Math.round(region.height)))
  return { x, y, width, height }
}

interface ColorBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  count: number
}

function findColorBox(
  image: Electron.NativeImage,
  yStartRatio: number,
  matcher: (r: number, g: number, b: number) => boolean,
  xStartRatio = 0,
  xEndRatio = 1
): ColorBox | null {
  const { width, height } = image.getSize()
  const bmp = image.toBitmap() // BGRA
  const xStart = Math.floor(width * xStartRatio)
  const xEnd = Math.floor(width * xEndRatio)
  const yStart = Math.floor(height * yStartRatio)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let count = 0

  // Step=2 to reduce CPU while keeping stable anchor detection.
  for (let y = yStart; y < height; y += 2) {
    for (let x = xStart; x < xEnd; x += 2) {
      const idx = (y * width + x) * 4
      const b = bmp[idx]
      const g = bmp[idx + 1]
      const r = bmp[idx + 2]
      if (!matcher(r, g, b)) continue
      count++
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (count < 40 || maxX <= minX || maxY <= minY) return null
  return { minX, minY, maxX, maxY, count }
}

function detectHudAnchorRegions(image: Electron.NativeImage): Partial<Record<'hp' | 'mp' | 'exp', CaptureRegion>> {
  const { width, height } = image.getSize()
  if (width < 600 || height < 400) return {}

  const redBox = findColorBox(
    image,
    0.78,
    (r, g, b) => r > 165 && (r - g) > 45 && (r - b) > 45,
    0.20,
    0.48
  )
  const blueBox = findColorBox(
    image,
    0.78,
    (r, g, b) => b > 150 && (b - r) > 40 && (b - g) > 20,
    0.33,
    0.62
  )
  const greenBox = findColorBox(
    image,
    0.76,
    (r, g, b) => g > 145 && (g - r) > 20 && (g - b) > 25,
    0.48,
    0.82
  )

  const regions: Partial<Record<'hp' | 'mp' | 'exp', CaptureRegion>> = {}

  if (redBox) {
    const hpRegion = clampRegion(
      {
        x: redBox.minX - Math.round(width * 0.01),
        y: redBox.minY - Math.round(height * 0.03),
        width: Math.round(width * 0.16),
        height: Math.round(height * 0.05)
      },
      image
    )
    regions.hp = hpRegion

    // If HP anchor is found, derive MP/EXP by known HUD relative offsets.
    if (!regions.mp) {
      regions.mp = clampRegion(
        {
          x: hpRegion.x + Math.round(width * 0.12),
          y: hpRegion.y,
          width: Math.round(width * 0.17),
          height: hpRegion.height
        },
        image
      )
    }
    if (!regions.exp) {
      regions.exp = clampRegion(
        {
          x: hpRegion.x + Math.round(width * 0.245),
          y: hpRegion.y,
          width: Math.round(width * 0.19),
          height: hpRegion.height
        },
        image
      )
    }
  }

  if (blueBox && !regions.mp) {
    const barW = blueBox.maxX - blueBox.minX + 1
    regions.mp = clampRegion(
      {
        x: blueBox.minX - Math.round(width * 0.01),
        y: blueBox.minY - Math.round(height * 0.03),
        width: barW + Math.round(width * 0.10),
        height: Math.round(height * 0.05)
      },
      image
    )
  }

  if (greenBox && !regions.exp) {
    const barW = greenBox.maxX - greenBox.minX + 1
    regions.exp = clampRegion(
      {
        x: greenBox.minX - Math.round(width * 0.01),
        y: greenBox.minY - Math.round(height * 0.03),
        width: barW + Math.round(width * 0.15),
        height: Math.round(height * 0.05)
      },
      image
    )
  }

  if (Date.now() - lastAnchorLogAt > 2000) {
    lastAnchorLogAt = Date.now()
    const debug = {
      hp: regions.hp ? `${regions.hp.x},${regions.hp.y},${regions.hp.width}x${regions.hp.height}` : '-',
      mp: regions.mp ? `${regions.mp.x},${regions.mp.y},${regions.mp.width}x${regions.mp.height}` : '-',
      exp: regions.exp ? `${regions.exp.x},${regions.exp.y},${regions.exp.width}x${regions.exp.height}` : '-'
    }
    log.info(`Auto anchor regions: hp=${debug.hp} mp=${debug.mp} exp=${debug.exp}`)
  }

  return regions
}

function getAutoAlignedRegion(
  image: Electron.NativeImage,
  regionId: string,
  fallback: CaptureRegion
): CaptureRegion {
  if (!['hp', 'mp', 'exp'].includes(regionId)) return fallback
  const { width, height } = image.getSize()
  const now = Date.now()
  if (!hudAnchorCache || hudAnchorCache.width !== width || hudAnchorCache.height !== height || now - hudAnchorCache.at > 1500) {
    hudAnchorCache = {
      width,
      height,
      at: now,
      regions: detectHudAnchorRegions(image)
    }
  }
  const region = hudAnchorCache.regions[regionId as 'hp' | 'mp' | 'exp']
  return region || fallback
}

/**
 * 擷取螢幕中指定區域的畫面並回傳 PNG Buffer
 * @param region - 要擷取的區域座標與尺寸
 * @returns 包含 PNG Buffer 及遊戲視窗是否存在的結果，或 null
 */
export async function captureRegion(region: CaptureRegion, regionId = ''): Promise<{ buffer: Buffer; gameWindowFound: boolean } | null> {
  const result = await captureScreen()
  if (!result) return null

  const alignedRegion = getAutoAlignedRegion(result.image, regionId, region)
  const cropped = cropRegion(result.image, alignedRegion)
  return { buffer: cropped.toPNG(), gameWindowFound: result.gameWindowFound }
}

/** 輕量檢查：遊戲視窗是否可見 */
export async function isGameWindowVisible(): Promise<boolean> {
  try {
    const sources = await listSelectableWindows()
    if (preferredWindowSourceId) {
      return sources.some((s) => s.id === preferredWindowSourceId)
    }
    if (preferredWindowName) {
      return sources.some((s) => s.name === preferredWindowName)
    }
    return sources.some((s) => s.isGameCandidate)
  } catch {
    return false
  }
}
