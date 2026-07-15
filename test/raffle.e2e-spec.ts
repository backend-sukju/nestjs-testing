import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrizePoolClient } from '../src/raffle/prize-pool.client';

/**
 * ── API 테스트 (주력) ────────────────────────────────────────
 * 질문1(무엇을 진짜로 두는가): 앱을 진짜로 띄우고 HTTP로 호출한다.
 *                            외부(PrizePoolClient)만 mock — 다른 서버·PG·외부 API는 태우지 않는다.
 * 질문2(무엇을 확인하는가):  계약(라우팅·인증·직렬화) + 동작 + 의미⭐ + 경계·이상 + 외부 실패
 *
 * mock한 것: PrizePoolClient (외부 상금풀 서버) — overrideProvider로 교체
 * ────────────────────────────────────────────────────────────
 *
 * 신규 API 체크리스트 매핑:
 *  - 계약     → 인증 분기(401), 파라미터 검증(400), 응답 구조
 *  - 동작     → 정상 회차 200 + winners 매핑
 *  - 의미 ⭐  → cashPerUser는 1인당(총액 아님)
 *  - 경계·이상 → 당첨자 없는 회차(빈 배열), 외부 실패(503)
 */
describe('GET /raffle/:round/winners (API test)', () => {
  let app: INestApplication;
  const getRankPrizes = jest.fn();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // 앱은 진짜 부팅하되, 외부 서버 클라이언트만 mock으로 갈아끼운다.
      .overrideProvider(PrizePoolClient)
      .useValue({ getRankPrizes })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getRankPrizes.mockReset();
  });

  const auth = (req: request.Test) => req.set('x-api-key', 'secret-key');

  // ── 계약: 인증 분기 ──
  it('[계약] API 키가 없으면 401', async () => {
    await request(app.getHttpServer()).get('/raffle/1226/winners').expect(401);
    expect(getRankPrizes).not.toHaveBeenCalled();
  });

  // ── 계약: 파라미터 검증 ──
  it('[계약] round가 숫자가 아니면 400', async () => {
    await auth(request(app.getHttpServer()).get('/raffle/abc/winners')).expect(400);
  });

  // ── 동작 + 계약(응답 구조) ──
  it('[동작] 정상 회차는 200과 { round, winners[] } 구조를 반환한다', async () => {
    getRankPrizes.mockResolvedValue([
      { rank: 1, totalCash: 30_000_000, winnerCount: 22 },
      { rank: 3, totalCash: 10_000_000, winnerCount: 3512 },
    ]);

    const res = await auth(
      request(app.getHttpServer()).get('/raffle/1226/winners'),
    ).expect(200);

    expect(res.body).toEqual({
      round: 1226,
      winners: [
        { rank: 1, cashPerUser: 1_363_636 }, // floor(30_000_000 / 22)
        { rank: 3, cashPerUser: 2_847 }, // floor(10_000_000 / 3512)
      ],
    });
  });

  // ── 의미 ⭐: 값의 뜻이 약속과 맞는가 ──
  it('[의미] cashPerUser는 1인당 금액이지 등수별 총액이 아니다', async () => {
    // 실제 사고 값: 3등 총액 10,000,000 / 인원 3512 → 1인당 2,847
    getRankPrizes.mockResolvedValue([
      { rank: 3, totalCash: 10_000_000, winnerCount: 3512 },
    ]);

    const res = await auth(
      request(app.getHttpServer()).get('/raffle/1226/winners'),
    ).expect(200);

    expect(res.body.winners[0].cashPerUser).toBe(2_847);
    // 총액이 그대로 새어나오면(=사고 재현) 실패
    expect(res.body.winners[0].cashPerUser).not.toBe(10_000_000);
  });

  // ── 경계·이상: 당첨자 없는 회차 ──
  it('[경계] 당첨자가 없는 회차는 winners 빈 배열을 반환한다', async () => {
    getRankPrizes.mockResolvedValue([]);

    const res = await auth(
      request(app.getHttpServer()).get('/raffle/9999/winners'),
    ).expect(200);

    expect(res.body).toEqual({ round: 9999, winners: [] });
  });

  // ── 경계·이상: 외부 실패 안전장치 ──
  it('[이상] 외부 상금풀 서버가 실패하면 규격화된 503을 반환한다', async () => {
    getRankPrizes.mockRejectedValue(new Error('upstream down'));

    await auth(request(app.getHttpServer()).get('/raffle/1226/winners')).expect(503);
  });
});
