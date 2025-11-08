import { Module } from '@nestjs/common'
import { LeaderboardModule } from './leaderboard/leaderboard.module.js'

@Module({
  imports: [LeaderboardModule],
})
export class AppModule {}
