import { LeaderboardEntry } from '../leaderboard.types.js'

/**
 * Implement this contract with Firebase or any other persistence layer.
 */
export interface LeaderboardRepository {
  loadEntries(dateKey: string): Promise<LeaderboardEntry[]>
  saveEntries(dateKey: string, entries: LeaderboardEntry[]): Promise<void>
  purgeEntriesBefore(dateKey: string): Promise<void>
}

export type LeaderboardRepositoryFactory = () => LeaderboardRepository
