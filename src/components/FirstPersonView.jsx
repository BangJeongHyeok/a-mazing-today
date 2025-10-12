import { useMemo } from 'react'
import { castRay, normalizeAngle } from '../utils/movement'

const VIEW_WIDTH = 600
const VIEW_HEIGHT = 400
const FIELD_OF_VIEW = Math.PI / 3
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
  const maxDepthReference = Math.max(4, size)

  const wallColumns = rays.map((ray) => {
    const correctedDistance = Math.max(0.0001, ray.distance * Math.cos(ray.angleDelta))
    const wallHeight = Math.min(VIEW_HEIGHT * 1.3, (VIEW_HEIGHT * 0.9) / correctedDistance)
    const top = (VIEW_HEIGHT - wallHeight) / 2
    const palette = ray.orientation === 'vertical' ? VERTICAL_SHADES : HORIZONTAL_SHADES
    const depthRatio = Math.min(1, correctedDistance / maxDepthReference)
    const shadeIndex = Math.min(palette.length - 1, Math.floor(depthRatio * palette.length))
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

  return (
    <div className="first-person-view">
      <svg className="first-person-canvas" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label="First-person maze view">
        <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT / 2} fill="#0f172a" />
        <rect x="0" y={VIEW_HEIGHT / 2} width={VIEW_WIDTH} height={VIEW_HEIGHT / 2} fill="#111827" />
        {wallColumns}
        {goalElements}
      </svg>
      <div className="first-person-overlay">
        <span className="first-person-heading">First-person view</span>
        <span className="first-person-facing">Heading {String(heading.degrees).padStart(3, '0')}° · {heading.label}</span>
      </div>
    </div>
  )
}

export default FirstPersonView
