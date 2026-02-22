import { useRef, useCallback, useEffect, useState } from 'react'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

type Edge = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

interface UseResizableOptions {
  initialRect: Rect
  enabled: boolean
  minWidth?: number
  minHeight?: number
  onRectChange?: (rect: Rect) => void
}

/** 提供元素拖曳移動與八方向縮放功能的 Hook，追蹤矩形位置和大小 */
export function useResizable({
  initialRect,
  enabled,
  minWidth = 20,
  minHeight = 10,
  onRectChange
}: UseResizableOptions) {
  const [rect, setRect] = useState<Rect>(initialRect)
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const resizeEdge = useRef<Edge>('se')
  const startMouse = useRef({ x: 0, y: 0 })
  const startRect = useRef<Rect>(initialRect)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return
      isDragging.current = true
      startMouse.current = { x: e.clientX, y: e.clientY }
      startRect.current = { ...rect }
      e.preventDefault()
      e.stopPropagation()
    },
    [enabled, rect]
  )

  const handleResizeMouseDown = useCallback(
    (edge: Edge) => (e: React.MouseEvent) => {
      if (!enabled) return
      isResizing.current = true
      resizeEdge.current = edge
      startMouse.current = { x: e.clientX, y: e.clientY }
      startRect.current = { ...rect }
      e.preventDefault()
      e.stopPropagation()
    },
    [enabled, rect]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current && !isResizing.current) return

      const dx = e.clientX - startMouse.current.x
      const dy = e.clientY - startMouse.current.y
      const sr = startRect.current

      if (isDragging.current) {
        const newRect = { ...sr, x: sr.x + dx, y: sr.y + dy }
        setRect(newRect)
        return
      }

      if (isResizing.current) {
        const edge = resizeEdge.current
        let { x, y, width, height } = sr

        if (edge.includes('e')) width = Math.max(minWidth, sr.width + dx)
        if (edge.includes('s')) height = Math.max(minHeight, sr.height + dy)
        if (edge.includes('w')) {
          const newW = Math.max(minWidth, sr.width - dx)
          x = sr.x + sr.width - newW
          width = newW
        }
        if (edge.includes('n')) {
          const newH = Math.max(minHeight, sr.height - dy)
          y = sr.y + sr.height - newH
          height = newH
        }

        setRect({ x, y, width, height })
      }
    }

    const handleMouseUp = () => {
      if (isDragging.current || isResizing.current) {
        isDragging.current = false
        isResizing.current = false
        onRectChange?.(rect)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [rect, minWidth, minHeight, onRectChange])

  return { rect, setRect, handleMouseDown, handleResizeMouseDown }
}

/** 所有可縮放的邊緣方向列表 */
export const EDGES: Edge[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** 各邊緣方向對應的 CSS 游標樣式 */
export const EDGE_CURSORS: Record<Edge, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize'
}
