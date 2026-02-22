import { BrowserWindow } from 'electron'
import { captureRegion, CaptureRegion, isGameWindowVisible } from './screen-capture'
import { runOcrPipeline } from '../ocr/ocr-pipeline'
import log from 'electron-log/main'

interface CaptureJob {
  id: string
  region: CaptureRegion
  interval: number // ms
  enabled: boolean
  processing: boolean
  lastRun: number
}

const jobs = new Map<string, CaptureJob>()
let overlayWindow: BrowserWindow | null = null
let running = true

// Dynamic tick — setTimeout to next job due time instead of fixed-interval polling
let tickTimer: ReturnType<typeof setTimeout> | null = null

// Game window detection
let consecutiveMisses = 0
let lastMissTimestamp = 0
const MISS_DEDUP_MS = 100
const MISS_THRESHOLD = 5
let autoPaused = false
let recoveryTimer: ReturnType<typeof setInterval> | null = null
const RECOVERY_CHECK_INTERVAL = 5000

/**
 * 初始化擷取排程器
 * @param window - 用於接收 OCR 結果的 BrowserWindow 實例
 */
export function initScheduler(window: BrowserWindow): void {
  overlayWindow = window
  log.info('Capture scheduler initialized')
}

function scheduleTick(): void {
  if (tickTimer) return
  if (!running || jobs.size === 0) return

  // Find the soonest job due time
  const now = Date.now()
  let minDelay = Infinity
  for (const job of jobs.values()) {
    if (!job.enabled || job.processing) continue
    const due = Math.max(0, job.interval - (now - job.lastRun))
    if (due < minDelay) minDelay = due
  }
  if (minDelay === Infinity) return

  tickTimer = setTimeout(() => {
    tickTimer = null
    if (!running || !overlayWindow) return

    const now = Date.now()
    for (const job of jobs.values()) {
      if (!job.enabled || job.processing) continue
      if (now - job.lastRun < job.interval) continue
      job.lastRun = now
      job.processing = true
      processJob(job).finally(() => {
        job.processing = false
        scheduleTick()
      })
    }

    // Re-schedule for remaining jobs
    scheduleTick()
  }, minDelay)
}

function stopTick(): void {
  if (tickTimer) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
}

async function processJob(job: CaptureJob): Promise<void> {
  try {
    const result = await captureRegion(job.region)

    if (!result || !result.gameWindowFound) {
      const now = Date.now()
      if (now - lastMissTimestamp > MISS_DEDUP_MS) {
        lastMissTimestamp = now
        consecutiveMisses++
        if (consecutiveMisses >= MISS_THRESHOLD && !autoPaused) {
          triggerAutoPause()
        }
      }
      return
    }

    consecutiveMisses = 0

    const ocrResult = await runOcrPipeline(job.id, result.buffer)
    if (ocrResult) {
      try {
        overlayWindow?.webContents.send(`ocr:${job.id}`, ocrResult)
      } catch {
        // Window may be destroyed during shutdown
      }
    }
  } catch (error) {
    log.error(`Capture job ${job.id} failed:`, error)
  }
}

/**
 * 新增一個擷取任務
 * @param id - 任務識別碼（如 'hp'、'mp'、'exp'）
 * @param region - 要擷取的螢幕區域
 * @param interval - 擷取間隔（毫秒）
 */
export function addCaptureJob(
  id: string,
  region: CaptureRegion,
  interval: number
): void {
  removeCaptureJob(id)

  const job: CaptureJob = {
    id,
    region,
    interval,
    enabled: running,
    processing: false,
    lastRun: 0
  }

  jobs.set(id, job)
  scheduleTick()
  log.info(`Capture job added: ${id} (interval: ${interval}ms)`)
}

function triggerAutoPause(): void {
  autoPaused = true
  for (const job of jobs.values()) {
    job.enabled = false
  }
  running = false
  stopTick()
  log.warn('Game window not detected — capture auto-paused')

  try {
    overlayWindow?.webContents.send('capture:auto-paused')
  } catch {
    // Window may be destroyed during shutdown
  }

  startRecoveryCheck()
}

function startRecoveryCheck(): void {
  if (recoveryTimer) return

  recoveryTimer = setInterval(async () => {
    const found = await isGameWindowVisible()
    if (found) {
      stopRecoveryCheck()
      autoPaused = false
      consecutiveMisses = 0
      running = true
      for (const job of jobs.values()) {
        job.enabled = true
      }
      if (jobs.size > 0) scheduleTick()
      log.info('Game window detected — capture auto-resumed')

      try {
        overlayWindow?.webContents.send('capture:auto-resumed')
      } catch {
        // Window may be destroyed during shutdown
      }
    }
  }, RECOVERY_CHECK_INTERVAL)
}

function stopRecoveryCheck(): void {
  if (recoveryTimer) {
    clearInterval(recoveryTimer)
    recoveryTimer = null
  }
}

/**
 * 移除指定的擷取任務
 * @param id - 要移除的任務識別碼
 */
export function removeCaptureJob(id: string): void {
  jobs.delete(id)
  if (jobs.size === 0) stopTick()
}

/** 暫停所有擷取任務 */
export function pauseAll(): void {
  running = false
  for (const job of jobs.values()) {
    job.enabled = false
  }
  stopTick()
  stopRecoveryCheck()
  autoPaused = false
  consecutiveMisses = 0
  log.info('All capture jobs paused')
}

/** 恢復所有擷取任務 */
export function resumeAll(): void {
  running = true
  autoPaused = false
  consecutiveMisses = 0
  stopRecoveryCheck()
  for (const job of jobs.values()) {
    job.enabled = true
  }
  if (jobs.size > 0) scheduleTick()
  log.info('All capture jobs resumed')
}

/** 回傳排程器是否正在執行 */
export function isRunning(): boolean {
  return running
}

/** 停止並清除所有擷取任務 */
export function stopAll(): void {
  stopRecoveryCheck()
  stopTick()
  jobs.clear()
  log.info('All capture jobs stopped')
}
