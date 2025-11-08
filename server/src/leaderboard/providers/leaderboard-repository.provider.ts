import { Provider } from '@nestjs/common'
import { LEADERBOARD_REPOSITORY } from '../leaderboard.constants.js'
import { LeaderboardRepository } from '../repositories/leaderboard.repository.js'
import { InMemoryLeaderboardRepository } from '../repositories/in-memory-leaderboard.repository.js'

export const leaderboardRepositoryProvider: Provider<LeaderboardRepository> = {
  provide: LEADERBOARD_REPOSITORY,
  // Swap this implementation with a Firebase-backed repository when the integration is ready.
  useClass: InMemoryLeaderboardRepository,
}
