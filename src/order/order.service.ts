import { Injectable } from '@nestjs/common';
import { Customer } from './grade';
import { DiscountPolicy } from './discount-policy';
import { PriceCalculator } from './price-calculator';
import { AuditLogger } from './audit-logger';
import { PaymentGateway } from './payment.gateway';
import { NotificationService } from './notification.service';

export class PaymentFailedError extends Error {
  constructor() {
    super('결제에 실패했습니다');
    this.name = 'PaymentFailedError';
  }
}

export interface CheckoutResult {
  paid: number;
  transactionId: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly discountPolicy: DiscountPolicy,
    private readonly priceCalculator: PriceCalculator,
    private readonly logger: AuditLogger,
    private readonly paymentGateway: PaymentGateway,
    private readonly notification: NotificationService,
  ) {}

  /**
   * 순수 계산 — 입력이 들어가면 값이 나온다. 결과 상태(최종가)로 검증 가능.
   *
   * 주의: 아래 세 줄(getRate -> applyDiscount -> logger.log)의 "호출 순서/횟수"는
   * 구현 디테일이지 규칙이 아니다. 테스트가 이 순서를 verify로 따라 쓰면 change-detector가 된다.
   */
  calculateFinalPrice(customer: Customer, amount: number): number {
    const rate = this.discountPolicy.getRate(customer.grade);
    const finalPrice = this.priceCalculator.applyDiscount(amount, rate);
    this.logger.log(
      `[discount] ${customer.grade} rate=${rate} ${amount} -> ${finalPrice}`,
    );
    return finalPrice;
  }

  /**
   * 부수효과 포함 — 결제 실패 시 알림 이메일을 보낸다.
   * 이메일 발송은 반환값/상태로 확인할 수 없으므로 상호작용 검증(verify)이 정당하다.
   */
  async checkout(customer: Customer, amount: number): Promise<CheckoutResult> {
    const finalPrice = this.calculateFinalPrice(customer, amount);
    const result = await this.paymentGateway.charge(customer.id, finalPrice);

    if (!result.success) {
      await this.notification.sendPaymentFailedEmail(customer);
      throw new PaymentFailedError();
    }

    return { paid: finalPrice, transactionId: result.transactionId! };
  }
}
