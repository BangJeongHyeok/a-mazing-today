import { Injectable } from '@nestjs/common'
import { LeaderboardEntry } from '../leaderboard.types.js'
import { LeaderboardRepository } from './leaderboard.repository.js'

interface StoredLeaderboard {
  entries: LeaderboardEntry[]
}

@Injectable()
export class InMemoryLeaderboardRepository implements LeaderboardRepository {
  private readonly storage = new Map<string, StoredLeaderboard>()

  async loadEntries(dateKey: string): Promise<LeaderboardEntry[]> {
    const stored = this.storage.get(dateKey)
    return stored ? [...stored.entries] : []
  }

  async saveEntries(dateKey: string, entries: LeaderboardEntry[]): Promise<void> {
    this.storage.set(dateKey, { entries: [...entries] })
  }

  async purgeEntriesBefore(dateKey: string): Promise<void> {
    for (const key of this.storage.keys()) {
      if (key < dateKey) {
        this.storage.delete(key)
      }
    }
  }
}
