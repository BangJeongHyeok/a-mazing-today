import { createSeededRandom, hashStringToSeed } from './random'

export function generateDailyMaze(size, dateString) {
  const seed = hashStringToSeed(dateString)
  return generateMaze(size, seed)
}

export function generateMaze(size, seed) {
  const cells = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      walls: {
        top: true,
        right: true,
        bottom: true,
        left: true,
      },
    })),
  )

  const visited = Array.from({ length: size }, () => Array(size).fill(false))
  const stack = []
  const startCell = cells[0][0]
  const random = createSeededRandom(seed)

  stack.push(startCell)
  visited[0][0] = true

  while (stack.length) {
    const current = stack[stack.length - 1]
    const { row, col } = current
    const neighbors = []

    if (row > 0 && !visited[row - 1][col]) {
      neighbors.push({ direction: 'top', cell: cells[row - 1][col] })
    }
    if (col < size - 1 && !visited[row][col + 1]) {
      neighbors.push({ direction: 'right', cell: cells[row][col + 1] })
    }
    if (row < size - 1 && !visited[row + 1][col]) {
      neighbors.push({ direction: 'bottom', cell: cells[row + 1][col] })
    }
    if (col > 0 && !visited[row][col - 1]) {
      neighbors.push({ direction: 'left', cell: cells[row][col - 1] })
    }

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }

    const { direction, cell: nextCell } = neighbors[Math.floor(random() * neighbors.length)]

    visited[nextCell.row][nextCell.col] = true
    removeWalls(current, nextCell, direction)
    stack.push(nextCell)
  }

  return cells
}

export function solveMazePath(maze) {
  if (!maze || maze.length === 0 || !maze[0] || maze[0].length === 0) {
    return []
  }

  const size = maze.length
  const visited = Array.from({ length: size }, () => Array(size).fill(false))
  const parent = Array.from({ length: size }, () => Array(size).fill(null))
  const queue = [{ row: 0, col: 0 }]
  visited[0][0] = true

  const directions = [
    { key: 'top', deltaRow: -1, deltaCol: 0 },
    { key: 'right', deltaRow: 0, deltaCol: 1 },
    { key: 'bottom', deltaRow: 1, deltaCol: 0 },
    { key: 'left', deltaRow: 0, deltaCol: -1 },
  ]

  while (queue.length) {
    const current = queue.shift()
    const { row, col } = current

    if (row === size - 1 && col === size - 1) {
      break
    }

    const cell = maze[row][col]

    directions.forEach(({ key, deltaRow, deltaCol }) => {
      if (cell.walls[key]) {
        return
      }

      const nextRow = row + deltaRow
      const nextCol = col + deltaCol

      if (
        nextRow < 0 ||
        nextCol < 0 ||
        nextRow >= size ||
        nextCol >= size ||
        visited[nextRow][nextCol]
      ) {
        return
      }

      visited[nextRow][nextCol] = true
      parent[nextRow][nextCol] = current
      queue.push({ row: nextRow, col: nextCol })
    })
  }

  if (!visited[size - 1][size - 1]) {
    return []
  }

  const path = []
  let cursor = { row: size - 1, col: size - 1 }

  while (cursor) {
    path.push({ row: cursor.row, col: cursor.col })
    cursor = parent[cursor.row][cursor.col]
  }

  return path.reverse()
}

function removeWalls(current, nextCell, direction) {
  if (direction === 'top') {
    current.walls.top = false
    nextCell.walls.bottom = false
  } else if (direction === 'right') {
    current.walls.right = false
    nextCell.walls.left = false
  } else if (direction === 'bottom') {
    current.walls.bottom = false
    nextCell.walls.top = false
  } else if (direction === 'left') {
    current.walls.left = false
    nextCell.walls.right = false
  }
}
