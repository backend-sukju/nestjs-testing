import { Test, TestingModule } from '@nestjs/testing';
import { OrderService, PaymentFailedError } from './order.service';
import { DiscountPolicy } from './discount-policy';
import { PriceCalculator } from './price-calculator';
import { AuditLogger } from './audit-logger';
import { PaymentGateway, PaymentResult } from './payment.gateway';
import { NotificationService } from './notification.service';
import { Customer, Grade } from './grade';
import { paymentGatewayContract } from './payment-gateway.contract';

/**
 * ✅ mock 대신 fake — 부수효과를 "상태"로 만들어 상태 검증한다.
 *
 * side-effect.spec.ts는 notification을 mock으로 두고 toHaveBeenCalledWith로
 * "불렸나"(상호작용)를 봤다. 여기서는 협력자를 계약(abstract class)을 extends 한
 * 인메모리 fake로 대체하고, fake에 쌓인 상태를 조회해서 검증한다.
 *
 * 이점:
 *  1) 계약을 extends 하므로, 프로덕션에서 charge/sendPaymentFailedEmail 시그니처를
 *     바꾸면 이 fake가 컴파일되지 않는다 → fake 드리프트를 컴파일러가 막는다.
 *  2) mockResolvedValue로 매번 정답을 주입하지 않는다. fake가 규칙대로 스스로 판단한다.
 *  3) 결과 상태로 검증하므로 내부 호출 구조가 바뀌어도 계약만 지키면 초록불.
 */

/** 계약을 extends → 시그니처가 어긋나면 컴파일 에러 */
class FakePaymentGateway extends PaymentGateway {
  private declineAll = false;
  readonly charges: { customerId: number; amount: number }[] = [];

  failNextCharges() {
    this.declineAll = true;
  }

  async charge(customerId: number, amount: number): Promise<PaymentResult> {
    this.charges.push({ customerId, amount });
    return this.declineAll
      ? { success: false }
      : { success: true, transactionId: `tx_${this.charges.length}` };
  }
}

/** 발송을 인메모리 상태로 기록하는 fake */
class FakeNotificationService extends NotificationService {
  readonly sentEmails: Customer[] = [];

  async sendPaymentFailedEmail(customer: Customer): Promise<void> {
    this.sentEmails.push(customer);
  }
}

describe('OrderService — ✅ 계약 추출 + fake 상태 검증', () => {
  let service: OrderService;
  let notification: FakeNotificationService;
  let paymentGateway: FakePaymentGateway;

  beforeEach(async () => {
    notification = new FakeNotificationService();
    paymentGateway = new FakePaymentGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        DiscountPolicy, // 진짜 구현 (할인은 결과로 검증)
        PriceCalculator, // 진짜 구현
        { provide: AuditLogger, useValue: { log: () => {} } },
        { provide: PaymentGateway, useValue: paymentGateway },
        { provide: NotificationService, useValue: notification },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  const vip: Customer = { id: 1, name: '김철수', grade: Grade.VIP };

  it('결제 실패 시, 실패 알림 이메일이 발송되어 있다 (상태로 검증)', async () => {
    paymentGateway.failNextCharges();

    await expect(service.checkout(vip, 10000)).rejects.toThrow(
      PaymentFailedError,
    );

    // "불렸나"(verify)가 아니라, fake에 쌓인 상태를 조회한다.
    expect(notification.sentEmails).toEqual([vip]);
  });

  it('결제 성공 시, 발송된 이메일이 없고 할인 금액으로 결제된다 (상태로 검증)', async () => {
    const result = await service.checkout(vip, 10000);

    expect(result).toEqual({ paid: 8000, transactionId: 'tx_1' });
    expect(notification.sentEmails).toEqual([]);
    expect(paymentGateway.charges).toEqual([{ customerId: 1, amount: 8000 }]);
  });
});

/**
 * fake가 진짜 구현과 "같은 동작 계약"을 지키는지 검증.
 * real 구현에도 (통합 테스트로) 같은 계약을 돌리면 fake 드리프트를 동작 차원까지 잡는다.
 */
describe('FakePaymentGateway — 동작 계약 준수', () => {
  paymentGatewayContract(() => new FakePaymentGateway());
});
