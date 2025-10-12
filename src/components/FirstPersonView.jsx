import { useMemo } from 'react'
import { DIRECTION_DELTAS, rotateLeft, rotateRight } from '../utils/directions'

const LAYER_RECTS = [
  { left: 64, right: 536, top: 36, bottom: 364 },
  { left: 140, right: 460, top: 88, bottom: 312 },
  { left: 204, right: 396, top: 132, bottom: 268 },
  { left: 244, right: 356, top: 160, bottom: 240 },
]

const TRANSITION_RECTS = [...LAYER_RECTS, { left: 292, right: 308, top: 192, bottom: 208 }]

const LEFT_WALL_SHADES = ['#1f2a44', '#212f4d', '#233357', '#253861']
const RIGHT_WALL_SHADES = ['#16203a', '#182444', '#1b284d', '#1d2c56']
const FRONT_WALL_SHADES = ['#2f3d5b', '#283552', '#212d48', '#1c2640']
const FLOOR_SHADES = ['#8e9baf', '#7f8ca0', '#707d92', '#646f82']
const CEILING_SHADES = ['#0b1221', '#0c1423', '#0d1625', '#0e1827']
const OUTLINE_COLOR = 'rgba(148, 163, 184, 0.45)'
const FLAG_COLOR = '#facc15'

const DIRECTION_LABELS = {
  top: 'North',
  right: 'East',
  bottom: 'South',
  left: 'West',
}

function FirstPersonView({ maze, position, facing }) {
  const size = maze.length

  const layers = useMemo(() => {
    if (!maze.length) {
      return []
    }

    const results = []
    const maxDepth = LAYER_RECTS.length
    const leftDir = rotateLeft(facing)
    const rightDir = rotateRight(facing)

    for (let depth = 0; depth < maxDepth; depth += 1) {
      const [dRow, dCol] = DIRECTION_DELTAS[facing]
      const targetRow = position.row + dRow * depth
      const targetCol = position.col + dCol * depth

      if (targetRow < 0 || targetRow >= size || targetCol < 0 || targetCol >= size) {
        break
      }

      const cell = maze[targetRow]?.[targetCol]
      if (!cell) {
        break
      }

      const layer = {
        depth,
        cell,
        frontWall: Boolean(cell.walls[facing]),
        leftWall: Boolean(cell.walls[leftDir]),
        rightWall: Boolean(cell.walls[rightDir]),
        position: { row: targetRow, col: targetCol },
        isFinish: targetRow === size - 1 && targetCol === size - 1,
      }

      results.push(layer)

      if (layer.frontWall) {
        break
      }
    }

    return results
  }, [maze, position, facing, size])

  const shapes = []
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index]
    const rect = LAYER_RECTS[layer.depth]
    const nextRect = TRANSITION_RECTS[layer.depth + 1]
    const shadeIndex = Math.min(layer.depth, LEFT_WALL_SHADES.length - 1)

    if (nextRect) {
      const floorPoints = [
        `${rect.left},${rect.bottom}`,
        `${rect.right},${rect.bottom}`,
        `${nextRect.right},${nextRect.bottom}`,
        `${nextRect.left},${nextRect.bottom}`,
      ].join(' ')
      shapes.push(
        <polygon
          key={`floor-${layer.depth}`}
          points={floorPoints}
          fill={FLOOR_SHADES[Math.min(layer.depth, FLOOR_SHADES.length - 1)]}
        />
      )

      const ceilingPoints = [
        `${rect.left},${rect.top}`,
        `${nextRect.left},${nextRect.top}`,
        `${nextRect.right},${nextRect.top}`,
        `${rect.right},${rect.top}`,
      ].join(' ')
      shapes.push(
        <polygon
          key={`ceiling-${layer.depth}`}
          points={ceilingPoints}
          fill={CEILING_SHADES[Math.min(layer.depth, CEILING_SHADES.length - 1)]}
        />
      )
    }

    if (layer.leftWall) {
      const leftWallPoints = [
        `${rect.left},${rect.top}`,
        `${nextRect.left},${nextRect.top}`,
        `${nextRect.left},${nextRect.bottom}`,
        `${rect.left},${rect.bottom}`,
      ].join(' ')
      shapes.push(
        <polygon
          key={`left-wall-${layer.depth}`}
          points={leftWallPoints}
          fill={LEFT_WALL_SHADES[shadeIndex]}
          stroke="#0f172a"
          strokeWidth={1.2}
        />
      )
    } else {
      shapes.push(
        <line
          key={`left-outline-${layer.depth}`}
          x1={rect.left}
          y1={rect.top}
          x2={rect.left}
          y2={rect.bottom}
          stroke={OUTLINE_COLOR}
          strokeWidth={1}
        />
      )
    }

    if (layer.rightWall) {
      const rightWallPoints = [
        `${rect.right},${rect.top}`,
        `${rect.right},${rect.bottom}`,
        `${nextRect.right},${nextRect.bottom}`,
        `${nextRect.right},${nextRect.top}`,
      ].join(' ')
      shapes.push(
        <polygon
          key={`right-wall-${layer.depth}`}
          points={rightWallPoints}
          fill={RIGHT_WALL_SHADES[shadeIndex]}
          stroke="#0f172a"
          strokeWidth={1.2}
        />
      )
    } else {
      shapes.push(
        <line
          key={`right-outline-${layer.depth}`}
          x1={rect.right}
          y1={rect.top}
          x2={rect.right}
          y2={rect.bottom}
          stroke={OUTLINE_COLOR}
          strokeWidth={1}
        />
      )
    }

    if (layer.frontWall) {
      shapes.push(
        <rect
          key={`front-wall-${layer.depth}`}
          x={rect.left}
          y={rect.top}
          width={rect.right - rect.left}
          height={rect.bottom - rect.top}
          fill={FRONT_WALL_SHADES[Math.min(layer.depth, FRONT_WALL_SHADES.length - 1)]}
          stroke="#0f172a"
          strokeWidth={1.4}
        />
      )
    } else {
      shapes.push(
        <line
          key={`vanish-left-${layer.depth}`}
          x1={rect.left}
          y1={rect.top}
          x2={nextRect.left}
          y2={nextRect.top}
          stroke={OUTLINE_COLOR}
          strokeWidth={1}
        />
      )
      shapes.push(
        <line
          key={`vanish-right-${layer.depth}`}
          x1={rect.right}
          y1={rect.top}
          x2={nextRect.right}
          y2={nextRect.top}
          stroke={OUTLINE_COLOR}
          strokeWidth={1}
        />
      )
      shapes.push(
        <line
          key={`vanish-floor-${layer.depth}`}
          x1={rect.left}
          y1={rect.bottom}
          x2={nextRect.left}
          y2={nextRect.bottom}
          stroke={OUTLINE_COLOR}
          strokeWidth={1}
        />
      )
      shapes.push(
        <line
          key={`vanish-floor-right-${layer.depth}`}
          x1={rect.right}
          y1={rect.bottom}
          x2={nextRect.right}
          y2={nextRect.bottom}
          stroke={OUTLINE_COLOR}
          strokeWidth={1}
        />
      )
    }

    if (layer.isFinish && !layer.frontWall) {
      const flagRect = nextRect || rect
      const poleX = (flagRect.left + flagRect.right) / 2
      const poleBottom = flagRect.bottom - (flagRect.bottom - flagRect.top) * 0.1
      const poleTop = poleBottom - (flagRect.bottom - flagRect.top) * 0.5
      const flagWidth = (flagRect.right - flagRect.left) * 0.35

      shapes.push(
        <g key={`goal-flag-${layer.depth}`}>
          <line x1={poleX} y1={poleBottom} x2={poleX} y2={poleTop} stroke={FLAG_COLOR} strokeWidth={Math.max(2, 5 - layer.depth)} />
          <polygon
            points={`${poleX},${poleTop} ${poleX + flagWidth},${poleTop + (flagRect.bottom - flagRect.top) * 0.12} ${poleX},${poleTop + (flagRect.bottom - flagRect.top) * 0.24}`}
            fill={FLAG_COLOR}
          />
        </g>
      )
    }
  }

  const directionLabel = DIRECTION_LABELS[facing] ?? 'Forward'

  return (
    <div className="first-person-view">
      <svg
        className="first-person-canvas"
        viewBox="0 0 600 400"
        role="img"
        aria-label={`First-person maze view facing ${directionLabel}`}
      >
        <rect x="0" y="0" width="600" height="200" fill="#0f172a" />
        <rect x="0" y="200" width="600" height="200" fill="#111827" />
        {shapes}
      </svg>
      <div className="first-person-overlay">
        <span className="first-person-heading">First-person view</span>
        <span className="first-person-facing">Facing {directionLabel}</span>
      </div>
    </div>
  )
}

export default FirstPersonView
