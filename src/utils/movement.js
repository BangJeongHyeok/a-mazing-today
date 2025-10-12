const CLAMP_EPSILON = 1e-4

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function normalizeAngle(angle) {
  let normalized = angle % (Math.PI * 2)
  if (normalized < 0) {
    normalized += Math.PI * 2
  }
  return normalized
}

export function attemptHorizontal(x, y, deltaX, maze) {
  if (deltaX === 0) {
    return { x, hit: false, wall: null }
  }

  const size = maze.length
  const row = Math.floor(y)
  let newX = x + deltaX
  let hit = false
  let wall = null

  if (deltaX > 0) {
    const boundary = Math.floor(x) + 1
    if (boundary >= size) {
      newX = clamp(newX, 0, size - CLAMP_EPSILON)
      hit = true
      wall = 'right'
    } else {
      const cell = maze[row]?.[boundary - 1]
      if (!cell || cell.walls.right) {
        newX = Math.min(newX, boundary - CLAMP_EPSILON)
        hit = true
        wall = 'right'
      }
    }
  } else {
    const col = Math.floor(x)
    if (col <= 0) {
      newX = clamp(newX, CLAMP_EPSILON, size)
      hit = true
      wall = 'left'
    } else {
      const cell = maze[row]?.[col]
      if (!cell || cell.walls.left) {
        newX = Math.max(newX, col + CLAMP_EPSILON)
        hit = true
        wall = 'left'
      }
    }
  }

  newX = clamp(newX, CLAMP_EPSILON, size - CLAMP_EPSILON)
  return { x: newX, hit, wall }
}

export function attemptVertical(x, y, deltaY, maze) {
  if (deltaY === 0) {
    return { y, hit: false, wall: null }
  }

  const size = maze.length
  const col = Math.floor(x)
  let newY = y + deltaY
  let hit = false
  let wall = null

  if (deltaY > 0) {
    const row = Math.floor(y)
    const boundary = row + 1
    if (boundary >= size) {
      newY = clamp(newY, 0, size - CLAMP_EPSILON)
      hit = true
      wall = 'bottom'
    } else {
      const cell = maze[row]?.[col]
      if (!cell || cell.walls.bottom) {
        newY = Math.min(newY, boundary - CLAMP_EPSILON)
        hit = true
        wall = 'bottom'
      }
    }
  } else {
    const row = Math.floor(y)
    if (row <= 0) {
      newY = clamp(newY, CLAMP_EPSILON, size)
      hit = true
      wall = 'top'
    } else {
      const cell = maze[row]?.[col]
      if (!cell || cell.walls.top) {
        newY = Math.max(newY, row + CLAMP_EPSILON)
        hit = true
        wall = 'top'
      }
    }
  }

  newY = clamp(newY, CLAMP_EPSILON, size - CLAMP_EPSILON)
  return { y: newY, hit, wall }
}

function clampStep(delta, maxStep) {
  const limit = Math.sign(delta) * Math.min(Math.abs(delta), maxStep)
  if (!Number.isFinite(limit)) {
    return 0
  }
  return limit
}

export function movePlayerPosition(position, deltaX, deltaY, maze) {
  const maxStep = 0.05
  let x = position.x
  let y = position.y
  let remainingX = deltaX
  let remainingY = deltaY
  let guard = 0

  while ((Math.abs(remainingX) > 1e-6 || Math.abs(remainingY) > 1e-6) && guard < 200) {
    guard += 1
    const stepX = clampStep(remainingX, maxStep)
    const horizontal = attemptHorizontal(x, y, stepX, maze)
    const actualDX = horizontal.x - x
    x = horizontal.x
    remainingX -= actualDX

    const stepY = clampStep(remainingY, maxStep)
    const vertical = attemptVertical(x, y, stepY, maze)
    const actualDY = vertical.y - y
    y = vertical.y
    remainingY -= actualDY

    if (
      (Math.abs(stepX) > 0 && Math.abs(actualDX) < 1e-6) &&
      (Math.abs(stepY) > 0 && Math.abs(actualDY) < 1e-6)
    ) {
      break
    }
  }

  return { x, y }
}

export function castRay(maze, start, angle, maxDistance = maze.length * Math.SQRT2) {
  const stepSize = 0.02
  const size = maze.length
  let x = start.x
  let y = start.y
  let distance = 0
  let goalVisible = false
  let goalDistance = null
  let orientation = 'none'

  for (let i = 0; i < 1000 && distance < maxDistance; i += 1) {
    const deltaX = Math.cos(angle) * stepSize
    const deltaY = Math.sin(angle) * stepSize

    const horizontal = attemptHorizontal(x, y, deltaX, maze)
    const vertical = attemptVertical(horizontal.x, y, deltaY, maze)

    const nextX = horizontal.x
    const nextY = vertical.y
    const movedDX = nextX - x
    const movedDY = nextY - y
    const stepDistance = Math.hypot(movedDX, movedDY)

    if (stepDistance < 1e-6) {
      orientation = horizontal.hit ? 'vertical' : vertical.hit ? 'horizontal' : 'none'
      break
    }

    distance += stepDistance
    x = nextX
    y = nextY

    const cellRow = Math.floor(y)
    const cellCol = Math.floor(x)
    if (!goalVisible && cellRow === size - 1 && cellCol === size - 1) {
      goalVisible = true
      goalDistance = distance
    }

    if (horizontal.hit || vertical.hit) {
      orientation = horizontal.hit ? 'vertical' : 'horizontal'
      break
    }
  }

  return {
    distance: Math.min(distance, maxDistance),
    orientation,
    goalVisible,
    goalDistance,
  }
}
