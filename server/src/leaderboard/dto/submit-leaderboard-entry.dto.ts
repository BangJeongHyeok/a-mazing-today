import { Type } from 'class-transformer'
import { IsISO8601, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator'

export class SubmitLeaderboardEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  nickname!: string

  @IsISO8601()
  completedAt!: string

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  durationMs!: number
}
