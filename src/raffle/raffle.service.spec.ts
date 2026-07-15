import { RaffleService } from './raffle.service';
import { PrizePoolClient } from './prize-pool.client';

/**
 * ── Unit 테스트 ─────────────────────────────────────────────
 * 질문1(무엇을 진짜로 두는가): 앱을 안 띄운다. 외부(PrizePoolClient)는 전부 mock.
 *                            RaffleService 클래스만 생성자 주입으로 단독 검증.
 * 질문2(무엇을 확인하는가):  로직(총액 ÷ 인원 = 1인당) + 의미(반환값이 1인당인가 총액인가)
 *
 * mock한 것: PrizePoolClient (외부 상금풀 서버)
 * ────────────────────────────────────────────────────────────
 */
describe('RaffleService (unit)', () => {
  let service: RaffleService;
  let getRankPrizes: jest.Mock;

  beforeEach(() => {
    getRankPrizes = jest.fn();
    const prizePool = { getRankPrizes } as unknown as PrizePoolClient;
    service = new RaffleService(prizePool);
  });

  // ── 로직: 계산이 맞나 ──
  it('1인당 금액 = 총액 ÷ 인원 으로 계산한다', async () => {
    getRankPrizes.mockResolvedValue([
      { rank: 1, totalCash: 10_000, winnerCount: 4 },
    ]);

    const result = await service.getWinnerPrizes(1226);

    expect(result[0].cashPerUser).toBe(2_500); // 10000 / 4
  });

  it('나누어 떨어지지 않으면 내림한다 (원 단위)', async () => {
    getRankPrizes.mockResolvedValue([
      { rank: 3, totalCash: 10_000, winnerCount: 3 },
    ]);

    const result = await service.getWinnerPrizes(1226);

    expect(result[0].cashPerUser).toBe(3_333); // floor(10000 / 3)
  });

  // ── 의미 ⭐: 그 값의 뜻이 약속과 맞나 (합계 vs 1인당) ──
  it('반환하는 값은 등수별 총액이 아니라 1인당 분배금이다', async () => {
    // 총액과 1인당을 "서로 다른 숫자"로 세팅하는 게 이 테스트의 생명.
    // (같으면 어느 쪽을 매핑하든 통과해서 의미 뒤바뀜을 못 잡는다)
    getRankPrizes.mockResolvedValue([
      { rank: 3, totalCash: 10_000_000, winnerCount: 3512 },
    ]);

    const result = await service.getWinnerPrizes(1226);

    expect(result[0].cashPerUser).toBe(2_847); // floor(10_000_000 / 3512)
    expect(result[0].cashPerUser).not.toBe(10_000_000); // 총액이 새면 실패
  });

  // ── 경계: 0으로 나누기 방지 ──
  it('당첨 인원이 0이면 0을 반환한다 (division by zero 방지)', async () => {
    getRankPrizes.mockResolvedValue([
      { rank: 1, totalCash: 10_000, winnerCount: 0 },
    ]);

    const result = await service.getWinnerPrizes(1226);

    expect(result[0].cashPerUser).toBe(0);
  });
});
