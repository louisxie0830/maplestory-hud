import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

type LogLevel = 'ALL' | 'INFO' | 'WARN' | 'ERROR'

interface LogLine {
  raw: string
  level: 'info' | 'warn' | 'error' | 'debug' | 'unknown'
  timestamp: string
  message: string
}

function parseLine(raw: string): LogLine {
  // electron-log format: [2024-01-15 12:34:56.789] [info]  message
  const match = raw.match(/^\[(.+?)\]\s*\[(\w+)\]\s*(.*)$/)
  if (match) {
    const level = (['info', 'warn', 'error', 'debug'].includes(match[2])
      ? match[2]
      : 'unknown') as LogLine['level']
    return { raw, level, timestamp: match[1], message: match[3] }
  }
  return { raw, level: 'unknown', timestamp: '', message: raw }
}

function filterLines(lines: LogLine[], filter: LogLevel): LogLine[] {
  if (filter === 'ALL') return lines
  const level = filter.toLowerCase()
  return lines.filter((l) => l.level === level)
}

/** 日誌檢視器，即時讀取並依等級篩選應用程式日誌 */
export const LogViewer: React.FC = () => {
  const [rawContent, setRawContent] = useState('')
  const [filter, setFilter] = useState<LogLevel>('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const [logPath, setLogPath] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    const content = await window.electronAPI.readLogs(500)
    setRawContent(content)
  }, [])

  // Initial load + path
  useEffect(() => {
    fetchLogs()
    window.electronAPI.getLogsPath().then(setLogPath)
  }, [fetchLogs])

  // Auto refresh every 2 seconds — only when window is visible
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (!interval) interval = setInterval(fetchLogs, 2000)
    }
    const stop = () => {
      if (interval) { clearInterval(interval); interval = null }
    }

    const onVisibility = () => {
      if (document.hidden) stop(); else start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchLogs])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [rawContent, autoScroll, filter])

  const { allLines, counts } = useMemo(() => {
    const parsed = rawContent
      .split('\n')
      .filter((l) => l.trim())
      .map(parseLine)

    const c = { all: parsed.length, info: 0, warn: 0, error: 0 }
    for (const line of parsed) {
      if (line.level === 'info') c.info++
      else if (line.level === 'warn') c.warn++
      else if (line.level === 'error') c.error++
    }
    return { allLines: parsed, counts: c }
  }, [rawContent])

  const displayLines = useMemo(
    () => filterLines(allLines, filter),
    [allLines, filter]
  )

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // If user scrolled up more than 50px from bottom, pause auto-scroll
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
  }

  return (
    <div className="log-viewer">
      <div className="log-toolbar">
        <div className="log-filters">
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as LogLevel[]).map((level) => {
            const count = level === 'ALL' ? counts.all
              : counts[level.toLowerCase() as keyof typeof counts]
            return (
              <button
                key={level}
                className={`log-filter-btn ${level.toLowerCase()} ${filter === level ? 'active' : ''}`}
                onClick={() => setFilter(level)}
              >
                {level}
                <span className="log-filter-count">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="log-actions">
          <button
            className={`log-action-btn ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? '自動捲動: 開' : '自動捲動: 關'}
          >
            {autoScroll ? '⬇ 追蹤' : '⏸ 暫停'}
          </button>
          <button
            className="log-action-btn"
            onClick={fetchLogs}
            title="重新載入"
          >
            ↻ 重整
          </button>
          <button
            className="log-action-btn"
            onClick={() => window.electronAPI.openLogsFolder()}
            title="開啟 Log 資料夾"
          >
            📂 開啟
          </button>
        </div>
      </div>

      <div className="log-path">
        {logPath}
      </div>

      <div
        className="log-content"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {displayLines.map((line, i) => (
          <div key={i} className={`log-line level-${line.level}`}>
            {line.timestamp && (
              <span className="log-ts">{line.timestamp}</span>
            )}
            {line.level !== 'unknown' && (
              <span className={`log-level ${line.level}`}>
                {line.level.toUpperCase()}
              </span>
            )}
            <span className="log-msg">{line.message || line.raw}</span>
          </div>
        ))}
        {displayLines.length === 0 && (
          <div className="log-empty">沒有符合條件的 Log</div>
        )}
      </div>
    </div>
  )
}
