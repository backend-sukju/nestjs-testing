import { Injectable } from '@nestjs/common';

@Injectable()
export class PriceCalculator {
  /** 금액에 할인율을 적용한 최종가(원 단위 반올림). */
  applyDiscount(amount: number, rate: number): number {
    return Math.round(amount * (1 - rate));
  }
}
