import { createWorker, createScheduler, PSM, type Scheduler, type Worker } from 'tesseract.js'
import log from 'electron-log/main'

let scheduler: Scheduler | null = null
const workers: Worker[] = []

export interface OcrResult {
  text: string
  confidence: number
}

/** 初始化 OCR 引擎，建立多個 Tesseract Worker 並設定辨識參數 */
export async function initOcrEngine(): Promise<void> {
  scheduler = createScheduler()

  // Create 3 workers in parallel for faster startup
  const settled = await Promise.allSettled(
    Array.from({ length: 3 }, async () => {
      const worker = await createWorker('eng', 1, {
        logger: () => {}
      })
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789,./%: ',
        tessedit_pageseg_mode: PSM.SINGLE_LINE
      })
      return worker
    })
  )

  const created: Worker[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      created.push(result.value)
    } else {
      log.warn('OCR worker creation failed:', result.reason)
    }
  }

  if (created.length === 0) {
    // All workers failed — clean up scheduler
    scheduler = null
    throw new Error('All OCR workers failed to initialize')
  }

  // Terminate created workers if we decide to abort entirely would go here,
  // but partial success is acceptable — just use however many we got
  for (const worker of created) {
    scheduler.addWorker(worker)
    workers.push(worker)
  }

  log.info(`OCR engine initialized with ${created.length} workers`)
}

/**
 * 對圖片進行 OCR 文字辨識
 * @param imageBuffer - 圖片的 Buffer 資料
 * @returns 辨識結果，包含文字與信心度（0-1）
 */
export async function recognizeImage(imageBuffer: Buffer): Promise<OcrResult> {
  if (!scheduler) {
    throw new Error('OCR engine not initialized')
  }

  const result = await scheduler.addJob('recognize', imageBuffer)

  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence / 100 // Normalize to 0-1
  }
}

/** 關閉 OCR 引擎並釋放所有 Worker 資源 */
export async function shutdownOcrEngine(): Promise<void> {
  if (scheduler) {
    await scheduler.terminate()
    scheduler = null
  }
  workers.length = 0
  log.info('OCR engine shut down')
}
