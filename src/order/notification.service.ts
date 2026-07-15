import { Injectable, Logger } from '@nestjs/common';
import { Customer } from './grade';

/**
 * 결제 실패 알림 이메일 발송. 발송 자체가 부수효과라 "결과 상태"로 조회할 수 없다.
 * → 이 협력자는 상호작용(verify)으로 검증하는 것이 정당한 회색지대다.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendPaymentFailedEmail(customer: Customer): Promise<void> {
    // 실제 구현에서는 이메일/푸시 발송
    this.logger.log(`결제 실패 알림 발송 -> ${customer.name}`);
  }
}
