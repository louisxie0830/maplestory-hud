/** 格式化大數字：1234567 → "1.23M"、12345 → "12.3K" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

/** 格式化完整數字並加上千分位逗號：1234567 → "1,234,567" */
export function formatFullNumber(n: number): string {
  return n.toLocaleString()
}

/** 將毫秒格式化為 MM:SS 或 HH:MM:SS */
export function formatTime(ms: number): string {
  if (ms <= 0) return '00:00'

  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

/** 將分鐘數格式化為易讀文字：45 → "45 分鐘"、120 → "2 小時" */
export function formatMinutes(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return '--'
  if (minutes < 60) return `${Math.round(minutes)} 分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (mins === 0) return `${hours} 小時`
  return `${hours} 小時 ${mins} 分`
}

/** 格式化百分比：45.2345 → "45.23%" */
export function formatPercent(value: number, decimals = 2): string {
  return value.toFixed(decimals) + '%'
}
