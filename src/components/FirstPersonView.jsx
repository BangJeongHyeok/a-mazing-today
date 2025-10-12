import { useMemo, useId } from 'react'
import { castRay, normalizeAngle } from '../utils/movement'

const VIEW_WIDTH = 600
const VIEW_HEIGHT = 400
const FIELD_OF_VIEW = Math.PI / 2
const NUM_RAYS = 160
// Shades applied to walls when a ray hits the vertical side of a tile, ordered
// from closest (index 0) to farthest (last index). Darker or lighter colors can
// be placed here to tune how vertical edges fade with distance.
const VERTICAL_SHADES = [
  '#1d2a45', // Nearest vertical wall face (adjacent tile)
  '#22304d', // Second distance step for vertical faces
  '#263555', // Mid-range vertical faces
  '#2b3b5d', // Farther vertical faces before horizon
  '#314266', // Farthest visible vertical faces (near horizon)
]

// Shades applied to walls when a ray hits the horizontal side of a tile, also
// ordered from nearest to farthest. Adjusting these values controls the depth
// shading for horizontal-facing walls independently of vertical ones.
const HORIZONTAL_SHADES = [
  '#141d31', // Nearest horizontal wall face (adjacent tile)
  '#182239', // Second distance step for horizontal faces
  '#1d2841', // Mid-range horizontal faces
  '#222e49', // Farther horizontal faces before horizon
  '#283452', // Farthest visible horizontal faces (near horizon)
]
const FLAG_COLOR = '#facc15'

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function describeHeading(angle) {
  const compassLabels = ['East', 'South-East', 'South', 'South-West', 'West', 'North-West', 'North', 'North-East']
  const normalized = normalizeAngle(angle)
  const degrees = (normalized * 180) / Math.PI
  const index = Math.round(degrees / 45) % compassLabels.length
  return {
    degrees: Math.round((degrees + 360) % 360),
    label: compassLabels[index],
  }
}

function FirstPersonView({ maze, player }) {
  const gradientId = useId()
  const skyGradientId = `${gradientId}-sky`
  const floorGradientId = `${gradientId}-floor`
  const size = maze.length
  const { rays, goalIndex } = useMemo(() => {
    if (!maze.length) {
      return { rays: [], goalIndex: null }
    }

    const maxDistance = Math.max(1, maze.length * Math.SQRT2)
    const halfFov = FIELD_OF_VIEW / 2
    const rayData = []
    let goalLeft = null
    let goalRight = null

    for (let i = 0; i < NUM_RAYS; i += 1) {
      const ratio = NUM_RAYS === 1 ? 0 : i / (NUM_RAYS - 1)
      const rayAngle = player.angle - halfFov + ratio * FIELD_OF_VIEW
      const sample = castRay(maze, player, rayAngle, maxDistance)
      const angleDelta = wrapAngle(rayAngle - player.angle)
      rayData.push({
        index: i,
        distance: sample.distance,
        orientation: sample.orientation,
        angleDelta,
        goalDistance: sample.goalVisible ? sample.goalDistance : null,
        hitPoint: sample.hitPoint,
      })

      if (sample.goalVisible) {
        if (goalLeft === null) {
          goalLeft = i
        }
        goalRight = i
      }
    }

    const goalIndexValue = goalLeft !== null ? Math.round((goalLeft + goalRight) / 2) : null
    return { rays: rayData, goalIndex: goalIndexValue }
  }, [maze, player.angle, player.x, player.y])

  const heading = describeHeading(player.angle)
  const columnWidth = VIEW_WIDTH / NUM_RAYS
  const maxDepthReference = Math.max(3.5, size * 0.85)

  const columnData = rays.map((ray) => {
    const correctedDistance = Math.max(0.0001, ray.distance * Math.cos(ray.angleDelta))
    const wallHeight = Math.min(VIEW_HEIGHT * 1.3, (VIEW_HEIGHT * 0.9) / correctedDistance)
    const top = (VIEW_HEIGHT - wallHeight) / 2
    const bottom = top + wallHeight
    const palette = ray.orientation === 'vertical' ? VERTICAL_SHADES : HORIZONTAL_SHADES
    const depthRatio = Math.min(1, correctedDistance / maxDepthReference)
    const shadeIndex = Math.min(palette.length - 1, Math.round(depthRatio * (palette.length - 1)))
    const fill = palette[shadeIndex]

    let planeKey = null

    if (ray.hitPoint && ray.orientation !== 'none') {
      const precision = (value) => Math.round(value * 1000) / 1000

      if (ray.orientation === 'vertical') {
        const axis = precision(ray.hitPoint.x)
        planeKey = `v:${axis}`
      } else if (ray.orientation === 'horizontal') {
        const axis = precision(ray.hitPoint.y)
        planeKey = `h:${axis}`
      }
    }

    return {
      ray,
      correctedDistance,
      wallHeight,
      top,
      bottom,
      fill,
      planeKey,
    }
  })

  const wallColumns = columnData.map((column) => (
    <rect
      key={`wall-${column.ray.index}`}
      x={column.ray.index * columnWidth}
      y={column.top}
      width={columnWidth + 1}
      height={column.wallHeight}
      fill={column.fill}
    />
  ))

  const edgeThreshold = {
    height: VIEW_HEIGHT * 0.035,
    distanceRatio: 0.18,
  }

  const wallEdges = columnData.flatMap((column, index) => {
    const edges = []
    const prev = columnData[index - 1]
    const next = columnData[index + 1]
    const depthRatio = Math.min(1, column.correctedDistance / maxDepthReference)
    const opacity = Math.max(0.12, 0.6 * (1 - depthRatio))

    const needsEdge = (neighbor, isCloserCheck = false) => {
      if (!neighbor) {
        return true
      }

      if (neighbor.planeKey && column.planeKey && neighbor.planeKey === column.planeKey) {
        return false
      }

      const heightDelta = Math.abs(neighbor.wallHeight - column.wallHeight)
      const distanceDelta = Math.abs(neighbor.correctedDistance - column.correctedDistance)
      const relativeDistance = distanceDelta / Math.max(column.correctedDistance, 0.0001)

      if (neighbor.ray.orientation !== column.ray.orientation) {
        return true
      }

      if (heightDelta > edgeThreshold.height || relativeDistance > edgeThreshold.distanceRatio) {
        return true
      }

      if (isCloserCheck && column.correctedDistance < neighbor.correctedDistance * (1 - edgeThreshold.distanceRatio)) {
        return true
      }

      return false
    }

    if (needsEdge(prev, true)) {
      const x = column.ray.index * columnWidth
      edges.push(
        <line
          key={`edge-left-${column.ray.index}`}
          x1={x}
          y1={column.top}
          x2={x}
          y2={column.bottom}
          stroke={`rgba(255, 255, 255, ${opacity.toFixed(3)})`}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      )
    }

    if (needsEdge(next)) {
      const x = (column.ray.index + 1) * columnWidth
      edges.push(
        <line
          key={`edge-right-${column.ray.index}`}
          x1={x}
          y1={column.top}
          x2={x}
          y2={column.bottom}
          stroke={`rgba(255, 255, 255, ${opacity.toFixed(3)})`}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      )
    }

    return edges
  })

  let goalElements = null
  if (goalIndex !== null && rays[goalIndex] && rays[goalIndex].goalDistance) {
    const ray = rays[goalIndex]
    const goalDistanceCorrected = Math.max(0.0001, ray.goalDistance * Math.cos(ray.angleDelta))
    const flagHeight = Math.min(VIEW_HEIGHT * 0.4, Math.max(22, (VIEW_HEIGHT * 0.35) / goalDistanceCorrected))
    const flagBottom = VIEW_HEIGHT * 0.7
    const flagTop = flagBottom - flagHeight
    const columnCenter = goalIndex * columnWidth + columnWidth / 2
    const poleHeight = flagHeight + 18
    const poleTop = flagTop - 6
    const poleBottom = poleTop + poleHeight
    const flagWidth = Math.max(columnWidth * 0.8, flagHeight * 0.45)

    goalElements = (
      <g key="goal-flag" className="goal-flag">
        <line
          x1={columnCenter}
          y1={poleTop}
          x2={columnCenter}
          y2={poleBottom}
          stroke={FLAG_COLOR}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <polygon
          points={`${columnCenter},${flagTop} ${columnCenter + flagWidth},${flagTop + flagHeight * 0.25} ${columnCenter},${flagTop + flagHeight * 0.5}`}
          fill={FLAG_COLOR}
          opacity={0.9}
        />
      </g>
    )
  }

  const vanishingX = VIEW_WIDTH / 2
  const vanishingY = VIEW_HEIGHT * 0.55
  const floorGuides = Array.from({ length: 5 }, (_, index) => {
    const depth = (index + 1) / 6
    const y = VIEW_HEIGHT / 2 + Math.pow(depth, 1.4) * (VIEW_HEIGHT / 2)
    const opacity = 0.25 - index * 0.03
    return (
      <line
        key={`floor-line-${index}`}
        x1={0}
        y1={y}
        x2={VIEW_WIDTH}
        y2={y}
        stroke="rgba(148, 163, 184, 0.3)"
        strokeWidth={1}
        opacity={Math.max(0.08, opacity)}
      />
    )
  })

  const laneGuides = [-2, -1, 1, 2].map((offset) => {
    const baseWidth = VIEW_WIDTH * 0.08
    const x1 = vanishingX + offset * baseWidth
    const x2 = VIEW_WIDTH / 2 + offset * VIEW_WIDTH * 0.45
    return (
      <line
        key={`lane-${offset}`}
        x1={x1}
        y1={vanishingY}
        x2={x2}
        y2={VIEW_HEIGHT}
        stroke="rgba(148, 163, 184, 0.15)"
        strokeWidth={1}
      />
    )
  })

  return (
    <div className="first-person-view">
      <svg className="first-person-canvas" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label="First-person maze view">
        <defs>
          <linearGradient id={skyGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id={floorGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1120" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT / 2} fill={`url(#${skyGradientId})`} />
        <rect x="0" y={VIEW_HEIGHT / 2} width={VIEW_WIDTH} height={VIEW_HEIGHT / 2} fill={`url(#${floorGradientId})`} />
        <line
          x1={0}
          y1={vanishingY}
          x2={VIEW_WIDTH}
          y2={vanishingY}
          stroke="rgba(148, 163, 184, 0.18)"
          strokeWidth={1}
        />
        {laneGuides}
        {floorGuides}
        {wallColumns}
        {goalElements}
        {wallEdges}
        <circle
          cx={VIEW_WIDTH / 2}
          cy={VIEW_HEIGHT / 2}
          r={4}
          stroke="#e5e7eb"
          strokeWidth={1}
          fill="rgba(15, 23, 42, 0.45)"
        />
        <line
          x1={VIEW_WIDTH / 2}
          y1={VIEW_HEIGHT / 2 - 10}
          x2={VIEW_WIDTH / 2}
          y2={VIEW_HEIGHT / 2 + 10}
          stroke="rgba(229, 231, 235, 0.45)"
          strokeWidth={1}
        />
        <line
          x1={VIEW_WIDTH / 2 - 10}
          y1={VIEW_HEIGHT / 2}
          x2={VIEW_WIDTH / 2 + 10}
          y2={VIEW_HEIGHT / 2}
          stroke="rgba(229, 231, 235, 0.45)"
          strokeWidth={1}
        />
      </svg>
      <div className="first-person-overlay">
        <span className="first-person-heading">First-person view</span>
        <span className="first-person-facing">Heading {String(heading.degrees).padStart(3, '0')}° · {heading.label}</span>
      </div>
    </div>
  )
}

export default FirstPersonView
