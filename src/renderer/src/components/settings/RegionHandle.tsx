import React from 'react'
import { useResizable, EDGES, EDGE_CURSORS, type Rect } from '../../hooks/useResizable'

const REGION_NAMES: Record<string, string> = {
  hp: 'HP',
  mp: 'MP',
  exp: 'EXP',
  damage: '傷害',
  meso: '楓幣',
  mapName: '地圖'
}

interface RegionHandleProps {
  regionId: string
  initialRect: Rect
  color: string
  onRectChange: (rect: Rect) => void
}

/** 區域拖曳控點，支援移動與八方向縮放調整擷取範圍 */
export const RegionHandle: React.FC<RegionHandleProps> = ({
  regionId,
  initialRect,
  color,
  onRectChange
}) => {
  const { rect, handleMouseDown, handleResizeMouseDown } = useResizable({
    initialRect,
    enabled: true,
    minWidth: 20,
    minHeight: 10,
    onRectChange
  })

  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: `2px solid ${color}`,
        background: `${color}26`,
        cursor: 'move',
        zIndex: 10001
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: 0,
          background: color,
          color: '#fff',
          padding: '1px 6px',
          fontSize: '11px',
          fontWeight: 600,
          borderRadius: '3px 3px 0 0',
          whiteSpace: 'nowrap'
        }}
      >
        {REGION_NAMES[regionId] || regionId}
        <span style={{ marginLeft: '6px', fontWeight: 400, fontSize: '10px' }}>
          {rect.width}x{rect.height}
        </span>
      </div>

      {/* Resize handles */}
      {EDGES.map((edge) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          width: edge.length === 1 ? (edge === 'n' || edge === 's' ? '100%' : '6px') : '8px',
          height: edge.length === 1 ? (edge === 'e' || edge === 'w' ? '100%' : '6px') : '8px',
          cursor: EDGE_CURSORS[edge],
          zIndex: 10002
        }

        // Position
        if (edge.includes('n')) style.top = -3
        if (edge.includes('s')) style.bottom = -3
        if (edge.includes('w')) style.left = -3
        if (edge.includes('e')) style.right = -3
        if (edge === 'n' || edge === 's') { style.left = 0; style.right = 0 }
        if (edge === 'e' || edge === 'w') { style.top = 0; style.bottom = 0 }

        // Corner dots
        const isCorner = edge.length === 2

        return (
          <div key={edge} style={style} onMouseDown={handleResizeMouseDown(edge)}>
            {isCorner && (
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: color,
                  borderRadius: '50%',
                  border: '1px solid #fff'
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
