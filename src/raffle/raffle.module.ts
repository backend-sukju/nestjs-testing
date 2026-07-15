import { Module } from '@nestjs/common';
import { RaffleController } from './raffle.controller';
import { RaffleService } from './raffle.service';
import { PrizePoolClient } from './prize-pool.client';

@Module({
  controllers: [RaffleController],
  providers: [RaffleService, PrizePoolClient],
  exports: [RaffleService],
})
export class RaffleModule {}
