export const DIRECTION_DELTAS = {
  top: [-1, 0],
  right: [0, 1],
  bottom: [1, 0],
  left: [0, -1],
}

const DIRECTIONS_ORDER = ['top', 'right', 'bottom', 'left']

export function rotateLeft(direction) {
  const index = DIRECTIONS_ORDER.indexOf(direction)
  if (index === -1) {
    return direction
  }
  return DIRECTIONS_ORDER[(index + DIRECTIONS_ORDER.length - 1) % DIRECTIONS_ORDER.length]
}

export function rotateRight(direction) {
  const index = DIRECTIONS_ORDER.indexOf(direction)
  if (index === -1) {
    return direction
  }
  return DIRECTIONS_ORDER[(index + 1) % DIRECTIONS_ORDER.length]
}

export function getOppositeDirection(direction) {
  const index = DIRECTIONS_ORDER.indexOf(direction)
  if (index === -1) {
    return direction
  }
  return DIRECTIONS_ORDER[(index + 2) % DIRECTIONS_ORDER.length]
}
