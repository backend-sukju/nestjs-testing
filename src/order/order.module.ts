import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { DiscountPolicy } from './discount-policy';
import { PriceCalculator } from './price-calculator';
import { AuditLogger } from './audit-logger';
import { PaymentGateway, RealPaymentGateway } from './payment.gateway';
import {
  NotificationService,
  EmailNotificationService,
} from './notification.service';

@Module({
  providers: [
    OrderService,
    DiscountPolicy,
    PriceCalculator,
    AuditLogger,
    { provide: PaymentGateway, useClass: RealPaymentGateway },
    { provide: NotificationService, useClass: EmailNotificationService },
  ],
  exports: [OrderService],
})
export class OrderModule {}
