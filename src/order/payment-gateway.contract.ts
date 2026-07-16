import { PaymentGateway } from './payment.gateway';

/**
 * PaymentGateway 동작 계약. fake와 real이 "같은 규칙"을 지키는지 공유 검증한다.
 * - fake에는 항상 돌린다(빠르니까).
 * - real 구현에는 통합 테스트 태그로 돌려 드리프트를 잡는다.
 *
 * 시그니처 드리프트는 abstract class extends가 컴파일 타임에 막고,
 * 동작 드리프트는 이 계약 테스트가 런타임에 막는다.
 */
export function paymentGatewayContract(factory: () => PaymentGateway) {
  it('성공한 결제는 transactionId를 함께 돌려준다', async () => {
    const gateway = factory();

    const result = await gateway.charge(1, 8000);

    if (result.success) {
      expect(result.transactionId).toBeDefined();
    }
  });
}
