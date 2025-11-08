import { Body, Controller, Get, Post } from '@nestjs/common'
import { LeaderboardService } from './leaderboard.service.js'
import { SubmitLeaderboardEntryDto } from './dto/submit-leaderboard-entry.dto.js'

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getDailyLeaderboard() {
    const entries = await this.leaderboardService.getDailyTopEntries()
    return { entries }
  }

  @Post()
  async submitEntry(@Body() body: SubmitLeaderboardEntryDto) {
    return this.leaderboardService.recordCompletion(body)
  }
}
