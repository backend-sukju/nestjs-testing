import { Injectable } from '@nestjs/common';
import { Grade } from './grade';

/**
 * 등급별 할인율. "VIP는 20% 할인" 같은 비즈니스 규칙이 여기에 산다.
 * 좋은 테스트는 이 표를 잘못 바꾸면(예: VIP 20% -> 15%) 빨간불이 떠야 한다.
 */
@Injectable()
export class DiscountPolicy {
  private readonly rates: Record<Grade, number> = {
    [Grade.NORMAL]: 0,
    [Grade.GOLD]: 0.1,
    [Grade.VIP]: 0.2,
  };

  getRate(grade: Grade): number {
    return this.rates[grade];
  }
}
