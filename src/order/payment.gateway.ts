import { Injectable } from '@nestjs/common';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
}

/**
 * 계약(port). 이 추상 클래스가 DI 토큰이자 컴파일 타임 계약이다.
 * 진짜 구현도, 테스트의 fake도 모두 이걸 extends 해야 하므로
 * 시그니처가 어긋나면 컴파일이 깨진다. (interface는 런타임에 사라져 DI 토큰이 못 된다)
 */
export abstract class PaymentGateway {
  abstract charge(customerId: number, amount: number): Promise<PaymentResult>;
}

/**
 * 외부 PG 연동 실제 구현. 테스트에서는 fake로 대체한다(실제 결제를 부를 순 없다).
 */
@Injectable()
export class RealPaymentGateway extends PaymentGateway {
  async charge(_customerId: number, _amount: number): Promise<PaymentResult> {
    throw new Error('실제 PG 연동이 필요합니다 (예시에서는 테스트가 fake로 대체)');
  }
}
