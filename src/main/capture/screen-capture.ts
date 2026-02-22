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

/** Cached screen capture with TTL to avoid redundant full-screen grabs */
let captureCache: {
  image: Electron.NativeImage
  gameWindowFound: boolean
  timestamp: number
} | null = null

const CACHE_TTL_MS = 100

/** Throttle "no source found" warnings to avoid log spam on high-frequency capture path */
let lastNoSourceWarn = 0

/** In-flight promise deduplication — prevents parallel desktopCapturer calls */
let inFlightCapture: Promise<CaptureScreenResult | null> | null = null

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

    const gameSource = windowSources.find(
      (s) => GAME_WINDOW_NAMES.some((n) => s.name.includes(n))
    )

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

/**
 * 擷取螢幕中指定區域的畫面並回傳 PNG Buffer
 * @param region - 要擷取的區域座標與尺寸
 * @returns 包含 PNG Buffer 及遊戲視窗是否存在的結果，或 null
 */
export async function captureRegion(region: CaptureRegion): Promise<{ buffer: Buffer; gameWindowFound: boolean } | null> {
  const result = await captureScreen()
  if (!result) return null

  const cropped = cropRegion(result.image, region)
  return { buffer: cropped.toPNG(), gameWindowFound: result.gameWindowFound }
}

/** 輕量檢查：遊戲視窗是否可見 */
export async function isGameWindowVisible(): Promise<boolean> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1, height: 1 }
    })
    return sources.some(
      (s) => GAME_WINDOW_NAMES.some((n) => s.name.includes(n))
    )
  } catch {
    return false
  }
}
