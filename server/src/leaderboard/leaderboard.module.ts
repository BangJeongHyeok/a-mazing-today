import { Module } from '@nestjs/common'
import { LeaderboardController } from './leaderboard.controller.js'
import { LeaderboardService } from './leaderboard.service.js'
import { leaderboardRepositoryProvider } from './providers/leaderboard-repository.provider.js'

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, leaderboardRepositoryProvider],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
