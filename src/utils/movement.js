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
  const size = maze.length

  if (size === 0) {
    return {
      distance: 0,
      orientation: 'none',
      goalVisible: false,
      goalDistance: null,
    }
  }

  const dirX = Math.cos(angle)
  const dirY = Math.sin(angle)

  const stepX = dirX === 0 ? 0 : dirX > 0 ? 1 : -1
  const stepY = dirY === 0 ? 0 : dirY > 0 ? 1 : -1

  const deltaDistX = dirX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirX)
  const deltaDistY = dirY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirY)

  let sideDistX
  if (stepX === 0) {
    sideDistX = Number.POSITIVE_INFINITY
  } else if (stepX > 0) {
    sideDistX = (Math.floor(start.x) + 1 - start.x) * deltaDistX
  } else {
    sideDistX = (start.x - Math.floor(start.x)) * deltaDistX
  }

  let sideDistY
  if (stepY === 0) {
    sideDistY = Number.POSITIVE_INFINITY
  } else if (stepY > 0) {
    sideDistY = (Math.floor(start.y) + 1 - start.y) * deltaDistY
  } else {
    sideDistY = (start.y - Math.floor(start.y)) * deltaDistY
  }

  let cellCol = clamp(Math.floor(start.x), 0, size - 1)
  let cellRow = clamp(Math.floor(start.y), 0, size - 1)

  const goalRow = size - 1
  const goalCol = size - 1

  let goalVisible = cellRow === goalRow && cellCol === goalCol
  let goalDistance = goalVisible ? 0 : null
  let distance = 0
  let orientation = 'none'

  const maxIterations = size * size * 4

  for (let i = 0; i < maxIterations; i += 1) {
    const nextIsVertical = sideDistX < sideDistY
    const boundaryDistance = nextIsVertical ? sideDistX : sideDistY

    if (boundaryDistance > maxDistance) {
      distance = maxDistance
      break
    }

    if (nextIsVertical) {
      const wall =
        stepX === 0 ||
        cellCol < 0 ||
        cellCol >= size ||
        cellRow < 0 ||
        cellRow >= size ||
        (stepX > 0
          ? maze[cellRow]?.[cellCol]?.walls.right ?? true
          : maze[cellRow]?.[cellCol]?.walls.left ?? true)

      if (wall) {
        distance = boundaryDistance
        orientation = 'vertical'
        break
      }

      cellCol += stepX
      sideDistX += deltaDistX
    } else {
      const wall =
        stepY === 0 ||
        cellCol < 0 ||
        cellCol >= size ||
        cellRow < 0 ||
        cellRow >= size ||
        (stepY > 0
          ? maze[cellRow]?.[cellCol]?.walls.bottom ?? true
          : maze[cellRow]?.[cellCol]?.walls.top ?? true)

      if (wall) {
        distance = boundaryDistance
        orientation = 'horizontal'
        break
      }

      cellRow += stepY
      sideDistY += deltaDistY
    }

    if (!goalVisible && cellRow === goalRow && cellCol === goalCol) {
      const centerX = goalCol + 0.5
      const centerY = goalRow + 0.5
      const toCenterX = centerX - start.x
      const toCenterY = centerY - start.y
      const projected = toCenterX * dirX + toCenterY * dirY

      if (projected > 0) {
        goalVisible = true
        goalDistance = Math.min(projected, maxDistance)
      }
    }
  }

  if (distance === 0 && orientation === 'none') {
    distance = maxDistance
  }

  return {
    distance,
    orientation,
    goalVisible,
    goalDistance,
  }
}
