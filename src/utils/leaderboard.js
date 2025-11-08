import { createSeededRandom, hashStringToSeed } from './random'

const SAMPLE_NAMES = [
  'Astra',
  'Blitz',
  'Comet',
  'Drift',
  'Echo',
  'Flux',
  'Glint',
  'Halo',
  'Ion',
  'Jolt',
  'Kite',
  'Lumen',
  'Nova',
  'Orbit',
  'Pulse',
]

const LEADERBOARD_LIMIT = 10

export function buildDailyMockLeaderboard(dateString) {
  const seed = hashStringToSeed(`leaderboard-${dateString}`)
  const random = createSeededRandom(seed)
  const startOfDay = new Date(`${dateString}T00:00:00Z`).getTime()

  const entries = Array.from({ length: 6 }, (_, index) => {
    const minutesAfterStart = Math.floor(random() * 12 * 60)
    const additionalSeconds = Math.floor(random() * 60)
    const completedAt = new Date(startOfDay + (minutesAfterStart * 60 + additionalSeconds) * 1000)
    const durationSeconds = 45 + Math.floor(random() * 240)

    return {
      nickname: SAMPLE_NAMES[(index + Math.floor(random() * SAMPLE_NAMES.length)) % SAMPLE_NAMES.length],
      completedAt: completedAt.toISOString(),
      durationMs: durationSeconds * 1000,
    }
  })

  return entries.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
}

export function insertLeaderboardEntry(entries, newEntry) {
  const updated = [...entries, newEntry]
  updated.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt) || a.durationMs - b.durationMs)
  return updated.slice(0, LEADERBOARD_LIMIT)
}
