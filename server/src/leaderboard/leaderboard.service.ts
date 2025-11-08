import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { differenceInMilliseconds, parseISO } from 'date-fns'
import { LEADERBOARD_MAX_SIZE, LEADERBOARD_REPOSITORY } from './leaderboard.constants.js'
import { LeaderboardEntry } from './leaderboard.types.js'
import { SubmitLeaderboardEntryDto } from './dto/submit-leaderboard-entry.dto.js'
import { LeaderboardRepository } from './repositories/leaderboard.repository.js'

interface DailyLeaderboardCache {
  dateKey: string
  entries: LeaderboardEntry[]
}

@Injectable()
export class LeaderboardService {
  private cache: DailyLeaderboardCache | null = null

  constructor(
    @Inject(LEADERBOARD_REPOSITORY) private readonly repository: LeaderboardRepository,
  ) {}

  async getDailyTopEntries(): Promise<LeaderboardEntry[]> {
    const cache = await this.ensureDailyCache()
    return [...cache.entries]
  }

  async recordCompletion(dto: SubmitLeaderboardEntryDto) {
    const sanitizedNickname = dto.nickname.trim()
    if (!sanitizedNickname) {
      throw new BadRequestException('Nickname is required')
    }

    const completedAt = parseISO(dto.completedAt)
    if (Number.isNaN(completedAt.getTime())) {
      throw new BadRequestException('completedAt must be a valid ISO-8601 timestamp')
    }

    const durationMs = Math.max(0, Math.floor(dto.durationMs))
    const entry: LeaderboardEntry = {
      nickname: sanitizedNickname,
      completedAt: completedAt.toISOString(),
      durationMs,
    }

    const cache = await this.ensureDailyCache()
    const nextEntries = this.insertEntry(cache.entries, entry)
    cache.entries = nextEntries

    await this.repository.saveEntries(cache.dateKey, nextEntries)

    const rank =
      nextEntries.findIndex(
        (candidate) =>
          candidate.nickname === entry.nickname && candidate.completedAt === entry.completedAt &&
          candidate.durationMs === entry.durationMs,
      ) + 1

    return {
      entry,
      rank,
      entries: [...nextEntries],
    }
  }

  private async ensureDailyCache(): Promise<DailyLeaderboardCache> {
    const todayKey = this.getCurrentKstDateKey()
    if (this.cache && this.cache.dateKey === todayKey) {
      return this.cache
    }

    await this.repository.purgeEntriesBefore(todayKey)
    const storedEntries = await this.repository.loadEntries(todayKey)
    const entries = this.normalizeEntries(storedEntries)

    this.cache = { dateKey: todayKey, entries }
    return this.cache
  }

  private normalizeEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    const trimmed = entries
      .map((entry) => {
        const parsedDate = parseISO(entry.completedAt)
        if (Number.isNaN(parsedDate.getTime())) {
          return null
        }

        return {
          nickname: entry.nickname.trim().slice(0, 32),
          completedAt: parsedDate.toISOString(),
          durationMs: Math.max(0, Math.floor(entry.durationMs)),
        }
      })
      .filter((entry): entry is LeaderboardEntry => Boolean(entry?.nickname))

    return this.sortEntries(trimmed).slice(0, LEADERBOARD_MAX_SIZE)
  }

  private insertEntry(entries: LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
    const combined = [...entries, entry]
    return this.sortEntries(combined).slice(0, LEADERBOARD_MAX_SIZE)
  }

  private sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return [...entries].sort((a, b) => {
      const timeDifference = differenceInMilliseconds(parseISO(a.completedAt), parseISO(b.completedAt))
      if (timeDifference !== 0) {
        return timeDifference
      }

      return a.durationMs - b.durationMs
    })
  }

  private getCurrentKstDateKey(referenceDate = new Date()): string {
    const utc = referenceDate.getTime()
    const kstOffsetMs = 9 * 60 * 60 * 1000
    const kstDate = new Date(utc + kstOffsetMs)
    return kstDate.toISOString().slice(0, 10)
  }
}
