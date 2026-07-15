import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { DiscountPolicy } from './discount-policy';
import { PriceCalculator } from './price-calculator';
import { AuditLogger } from './audit-logger';
import { PaymentGateway } from './payment.gateway';
import { NotificationService } from './notification.service';
import { Customer, Grade } from './grade';

/**
 * ✅ 좋은 테스트 — 동작(behavior)을 검증한다.
 *
 * 핵심:
 *  - DiscountPolicy와 PriceCalculator는 "진짜 구현"을 그대로 주입한다.
 *    → "무엇이 들어가면 무엇이 나온다"를 규칙 전체로 관통해서 검증한다.
 *  - AuditLogger처럼 결과에 영향 없는 부수효과만 무해한 스텁으로 대체한다.
 *  - 검증은 오직 결과(최종가). 내부에서 뭘 어떤 순서로 불렀는지는 신경 쓰지 않는다.
 *
 * 그래서:
 *  - 내부를 어떻게 리팩터링해도(로깅 제거, 협력자 교체, 계산 순서 변경) 규칙만 그대로면 초록불.
 *  - 누가 VIP 할인율을 15%로 잘못 바꾸면 8500이 나와서 즉시 빨간불 → 결함을 잡는다.
 */
describe('OrderService — ✅ 동작을 검증하는 테스트', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        DiscountPolicy, // 진짜 구현
        PriceCalculator, // 진짜 구현
        { provide: AuditLogger, useValue: { log: jest.fn() } }, // 결과 무관 → 무해한 스텁
        { provide: PaymentGateway, useValue: { charge: jest.fn() } },
        {
          provide: NotificationService,
          useValue: { sendPaymentFailedEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it.each([
    // [등급, 주문금액, 최종가] — 사람이 정한 비즈니스 규칙을 값으로 못박는다.
    [Grade.VIP, 10000, 8000], // VIP는 20% 할인
    [Grade.GOLD, 10000, 9000], // GOLD는 10% 할인
    [Grade.NORMAL, 10000, 10000], // 일반은 할인 없음
  ])('%s 등급은 %d원 주문 시 최종 %d원을 낸다', (grade, amount, expected) => {
    const customer: Customer = { id: 1, name: '김철수', grade };

    const finalPrice = service.calculateFinalPrice(customer, amount);

    expect(finalPrice).toBe(expected);
  });
});
