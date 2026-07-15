import { Injectable } from '@nestjs/common';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
}

/**
 * 외부 PG 연동. 테스트에서는 항상 스텁으로 대체한다(실제 결제를 부를 순 없다).
 */
@Injectable()
export class PaymentGateway {
  async charge(_customerId: number, _amount: number): Promise<PaymentResult> {
    throw new Error('실제 PG 연동이 필요합니다 (예시에서는 테스트가 스텁으로 대체)');
  }
}
