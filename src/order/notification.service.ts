import { Injectable, Logger } from '@nestjs/common';
import { Customer } from './grade';

/**
 * 결제 실패 알림 계약(port). 발송 자체가 부수효과다.
 * mock으로 "불렸나"를 verify하는 대신, fake로 "발송된 상태"를 만들어 상태 검증할 수 있다.
 */
export abstract class NotificationService {
  abstract sendPaymentFailedEmail(customer: Customer): Promise<void>;
}

@Injectable()
export class EmailNotificationService extends NotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  async sendPaymentFailedEmail(customer: Customer): Promise<void> {
    // 실제 구현에서는 이메일/푸시 발송
    this.logger.log(`결제 실패 알림 발송 -> ${customer.name}`);
  }
}
