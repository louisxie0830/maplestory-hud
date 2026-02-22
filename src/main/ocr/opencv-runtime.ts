import log from 'electron-log/main'

let cvReady = false
let cvAvailable = false
let cvVersion = ''

/**
 * 嘗試初始化 OpenCV.js（Node 端可選能力）
 * 失敗時不阻斷 OCR 主流程，僅記錄狀態供後續功能使用。
 */
export async function initOpenCvRuntime(): Promise<void> {
  if (cvReady) return
  cvReady = true

  try {
    const mod = await import('@techstark/opencv-js')
    const cv = (mod.default ?? mod) as Record<string, unknown>
    cvAvailable = typeof cv === 'object' && cv !== null
    const version = String(cv.CV_VERSION ?? '').trim()
    cvVersion = version
    if (cvAvailable) {
      log.info(`OpenCV runtime ready${version ? ` (v${version})` : ''}`)
    }
  } catch (err) {
    cvAvailable = false
    log.warn('OpenCV runtime unavailable, fallback to sharp+tesseract only:', err)
  }
}
