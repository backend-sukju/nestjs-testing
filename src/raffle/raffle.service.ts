import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrizePoolClient, RankPrize } from './prize-pool.client';

/**
 * 유저에게 안내될 값. 외부의 totalCash(합계)와 이름이 다르다 —
 * 이 값은 **1인당 분배금**이다. (동명이의 방지를 위해 필드명에 의미를 박았다)
 */
export interface WinnerPrize {
  rank: number;
  cashPerUser: number;
}

@Injectable()
export class RaffleService {
  constructor(private readonly prizePool: PrizePoolClient) {}

  async getWinnerPrizes(round: number): Promise<WinnerPrize[]> {
    let ranks: RankPrize[];
    try {
      ranks = await this.prizePool.getRankPrizes(round);
    } catch {
      // 외부(상금풀 서버) 실패 → 스택 노출 대신 규격화된 503 (실패 안전장치)
      throw new ServiceUnavailableException('상금 정보를 가져오지 못했습니다');
    }

    return ranks.map((r) => ({
      rank: r.rank,
      // 파생: 1인당 = 총액 ÷ 인원. 여기가 의미가 뒤바뀌기 쉬운 지점이다.
      cashPerUser: this.perUser(r.totalCash, r.winnerCount),
    }));
  }

  private perUser(totalCash: number, winnerCount: number): number {
    if (winnerCount <= 0) return 0; // 경계: 0으로 나누기 방지
    return Math.floor(totalCash / winnerCount);
  }
}
