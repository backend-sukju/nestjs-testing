import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { DiscountPolicy } from './discount-policy';
import { PriceCalculator } from './price-calculator';
import { AuditLogger } from './audit-logger';
import { PaymentGateway } from './payment.gateway';
import { NotificationService } from './notification.service';
import { Customer, Grade } from './grade';

/**
 * ❌ 나쁜 테스트 — change-detector test (구조를 그대로 베낀 거울)
 *
 * 문제점 4가지:
 *  1) 결과를 하나도 안 본다. 할인이 8000원 나왔는지 검증이 없다. "불렸다"만 본다.
 *  2) 프로덕션 코드의 세 줄(getRate -> applyDiscount -> logger.log)을 verify로 그대로 따라 썼다.
 *     코드와 테스트가 똑같이 생겼다.
 *  3) 리팩터링하면 무조건 깨진다. 로깅을 빼거나 협력자를 교체하면 결과가 정확해도 빨간불.
 *  4) 결함을 못 잡는다. 협력자를 canned 값으로 스텁했기 때문에, 진짜 DiscountPolicy가
 *     VIP 할인율을 15%로 잘못 바꿔도 이 테스트는 초록불이다.
 *
 * → 구글이 말한 "결함은 못 잡고 유지보수 비용만 늘리니 지우는 게 낫다"의 표본.
 *   (실행하면 통과한다. 통과한다는 게 이 테스트가 나쁘지 않다는 뜻은 아니다.)
 */
describe('OrderService — ❌ 구조를 베낀 테스트 (change-detector)', () => {
  let service: OrderService;
  let discountPolicy: { getRate: jest.Mock };
  let priceCalculator: { applyDiscount: jest.Mock };
  let logger: { log: jest.Mock };

  beforeEach(async () => {
    // 순수 계산기까지 전부 스텁으로 대체 → 진짜 규칙은 한 줄도 실행되지 않는다.
    discountPolicy = { getRate: jest.fn().mockReturnValue(0.2) };
    priceCalculator = { applyDiscount: jest.fn().mockReturnValue(8000) };
    logger = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: DiscountPolicy, useValue: discountPolicy },
        { provide: PriceCalculator, useValue: priceCalculator },
        { provide: AuditLogger, useValue: logger },
        { provide: PaymentGateway, useValue: { charge: jest.fn() } },
        {
          provide: NotificationService,
          useValue: { sendPaymentFailedEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('할인을 계산한다 (내부 호출만 검증)', () => {
    const vip: Customer = { id: 1, name: '김철수', grade: Grade.VIP };

    service.calculateFinalPrice(vip, 10000);

    // 내부에서 무엇을, 어떤 인자로 불렀는지만 본다. 결과(반환값)는 쳐다보지도 않는다.
    expect(discountPolicy.getRate).toHaveBeenCalledWith(Grade.VIP);
    expect(priceCalculator.applyDiscount).toHaveBeenCalledWith(10000, 0.2);
    expect(logger.log).toHaveBeenCalled();
    // ⚠️ 여기 어디에도 "8000원이 나와야 한다"는 규칙 검증이 없다.
  });
});
