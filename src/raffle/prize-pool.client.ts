import { Injectable } from '@nestjs/common';

/**
 * 외부 "상금풀 서버"가 내려주는 등수별 상금 원본.
 * 핵심: 여기 있는 cash는 **등수별 총액(합계)** 이다. 1인당 금액이 아니다.
 */
export interface RankPrize {
  rank: number;
  totalCash: number; // 등수별 총 상금 (합계)
  winnerCount: number; // 그 등수 당첨 인원
}

/**
 * 외부 서버 연동 클라이언트. 테스트에서는 항상 mock으로 대체한다
 * (unit은 생성자 주입 mock, API 테스트는 overrideProvider).
 */
@Injectable()
export class PrizePoolClient {
  async getRankPrizes(_round: number): Promise<RankPrize[]> {
    throw new Error('외부 상금풀 서버 연동 필요 (테스트에서는 mock으로 대체)');
  }
}
