import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { DiscountPolicy } from './discount-policy';
import { PriceCalculator } from './price-calculator';
import { AuditLogger } from './audit-logger';
import { PaymentGateway } from './payment.gateway';
import { NotificationService } from './notification.service';

@Module({
  providers: [
    OrderService,
    DiscountPolicy,
    PriceCalculator,
    AuditLogger,
    PaymentGateway,
    NotificationService,
  ],
  exports: [OrderService],
})
export class OrderModule {}
