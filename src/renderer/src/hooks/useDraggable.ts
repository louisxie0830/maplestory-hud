import { useRef, useCallback, useEffect, useState } from 'react'

interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  initialPosition: Position
  enabled: boolean
  onPositionChange?: (pos: Position) => void
}

/** 提供元素拖曳功能的 Hook，追蹤位置並在拖曳結束時回呼通知 */
export function useDraggable({ initialPosition, enabled, onPositionChange }: UseDraggableOptions) {
  const [position, setPosition] = useState<Position>(initialPosition)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return
      // Don't start drag from interactive elements
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT' || tag === 'TEXTAREA') return
      isDragging.current = true
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      }
      e.preventDefault()
    },
    [enabled, position]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const newPos = {
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      }
      setPosition(newPos)
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        onPositionChange?.(position)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [position, onPositionChange])

  return {
    position,
    setPosition,
    handleMouseDown,
    isDragging: isDragging.current
  }
}
