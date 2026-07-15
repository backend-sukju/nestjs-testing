import { Test, TestingModule } from '@nestjs/testing';
import { OrderService, PaymentFailedError } from './order.service';
import { DiscountPolicy } from './discount-policy';
import { PriceCalculator } from './price-calculator';
import { AuditLogger } from './audit-logger';
import { PaymentGateway } from './payment.gateway';
import { NotificationService } from './notification.service';
import { Customer, Grade } from './grade';

/**
 * ⚪ 회색지대 — verify가 "정당한" 경우.
 *
 * 기준: 결과 상태로 검증할 수 있으면 그걸 우선한다. 도저히 안 될 때만 상호작용을 검증한다.
 *
 * "결제 실패 시 실패 알림 이메일을 보낸다"는 규칙은 이메일 발송이 부수효과라
 * 반환값/상태로 조회할 수 없다. 그래서 verify(sendPaymentFailedEmail)가 맞다.
 * → "편해서"가 아니라 "그 방법밖에 없어서" 쓰는 verify.
 *
 * 반대로 결제 성공 케이스에서 "결제 금액"은 결과 상태로 검증 가능하므로 verify가 아니라
 * 반환값(result.paid)을 본다.
 */
describe('OrderService — ⚪ 회색지대: 부수효과는 상호작용으로 검증', () => {
  let service: OrderService;
  let paymentGateway: { charge: jest.Mock };
  let notification: { sendPaymentFailedEmail: jest.Mock };

  beforeEach(async () => {
    paymentGateway = { charge: jest.fn() };
    notification = { sendPaymentFailedEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        DiscountPolicy, // 진짜 구현 (할인은 결과로 검증)
        PriceCalculator, // 진짜 구현
        { provide: AuditLogger, useValue: { log: jest.fn() } },
        { provide: PaymentGateway, useValue: paymentGateway },
        { provide: NotificationService, useValue: notification },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  const vip: Customer = { id: 1, name: '김철수', grade: Grade.VIP };

  it('결제 실패 시, 실패 알림 이메일을 보낸다 (verify가 정당)', async () => {
    paymentGateway.charge.mockResolvedValue({ success: false });

    await expect(service.checkout(vip, 10000)).rejects.toThrow(
      PaymentFailedError,
    );

    // 이메일 발송은 결과 상태로 조회 불가 → 상호작용 검증이 유일한 방법
    expect(notification.sendPaymentFailedEmail).toHaveBeenCalledWith(vip);
  });

  it('결제 성공 시, 알림을 보내지 않고 할인된 금액을 결제한다 (결과 상태로 검증)', async () => {
    paymentGateway.charge.mockResolvedValue({
      success: true,
      transactionId: 'tx_1',
    });

    const result = await service.checkout(vip, 10000);

    // 검증 가능한 결과가 있으면 verify보다 결과 상태를 우선한다.
    expect(result).toEqual({ paid: 8000, transactionId: 'tx_1' });
    expect(notification.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });
});
