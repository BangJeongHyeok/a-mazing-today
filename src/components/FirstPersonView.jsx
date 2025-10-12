import { useMemo, useId } from 'react'
import { castRay, normalizeAngle } from '../utils/movement'

const VIEW_WIDTH = 600
const VIEW_HEIGHT = 400
const FIELD_OF_VIEW = Math.PI / 2
const NUM_RAYS = 160
const VERTICAL_SHADES = ['#1d2a45', '#22304d', '#263555', '#2b3b5d', '#314266']
const HORIZONTAL_SHADES = ['#141d31', '#182239', '#1d2841', '#222e49', '#283452']
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

  const wallColumns = rays.map((ray) => {
    const correctedDistance = Math.max(0.0001, ray.distance * Math.cos(ray.angleDelta))
    const wallHeight = Math.min(VIEW_HEIGHT * 1.3, (VIEW_HEIGHT * 0.9) / correctedDistance)
    const top = (VIEW_HEIGHT - wallHeight) / 2
    const palette = ray.orientation === 'vertical' ? VERTICAL_SHADES : HORIZONTAL_SHADES
    const depthRatio = Math.min(1, correctedDistance / maxDepthReference)
    const shadeIndex = Math.min(palette.length - 1, Math.round(depthRatio * (palette.length - 1)))
    const fill = palette[shadeIndex]

    return (
      <rect
        key={`wall-${ray.index}`}
        x={ray.index * columnWidth}
        y={top}
        width={columnWidth + 1}
        height={wallHeight}
        fill={fill}
      />
    )
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
