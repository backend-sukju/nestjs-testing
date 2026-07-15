import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RaffleService } from './raffle.service';
import { ApiKeyGuard } from './api-key.guard';

@Controller('raffle')
export class RaffleController {
  constructor(private readonly raffleService: RaffleService) {}

  @UseGuards(ApiKeyGuard)
  @Get(':round/winners')
  async getWinners(@Param('round', ParseIntPipe) round: number) {
    const winners = await this.raffleService.getWinnerPrizes(round);
    return { round, winners };
  }
}
