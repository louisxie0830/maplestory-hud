import { getOcrHealthSummary } from './ocr/health-metrics'

let lastCpuUsage = process.cpuUsage()
let lastCpuTime = Date.now()
let lastOcrTotal = 0

export interface RuntimeHealthSnapshot {
  timestamp: number
  memoryRssMb: number
  memoryHeapUsedMb: number
  cpuPercentApprox: number
  ocrFpsApprox: number
  ocrTotalSamples: number
}

export function getRuntimeHealthSnapshot(): RuntimeHealthSnapshot {
  const now = Date.now()
  const cpu = process.cpuUsage(lastCpuUsage)
  const elapsedMs = Math.max(1, now - lastCpuTime)
  const cpuPercentApprox = Math.max(
    0,
    Math.min(100, ((cpu.user + cpu.system) / 1000 / elapsedMs) * 100)
  )
  lastCpuUsage = process.cpuUsage()
  lastCpuTime = now

  const memory = process.memoryUsage()
  const ocrSummary = getOcrHealthSummary()
  const total = ocrSummary.reduce((sum, row) => sum + row.total, 0)
  const delta = Math.max(0, total - lastOcrTotal)
  const ocrFpsApprox = delta / (elapsedMs / 1000)
  lastOcrTotal = total

  return {
    timestamp: now,
    memoryRssMb: Math.round((memory.rss / (1024 * 1024)) * 10) / 10,
    memoryHeapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 10) / 10,
    cpuPercentApprox: Math.round(cpuPercentApprox * 10) / 10,
    ocrFpsApprox: Math.round(ocrFpsApprox * 10) / 10,
    ocrTotalSamples: total
  }
}
