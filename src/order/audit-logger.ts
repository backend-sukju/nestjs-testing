import { Injectable, Logger } from '@nestjs/common';

/**
 * 부수효과(로깅) 협력자. 할인 결과에는 영향을 주지 않는다.
 * "로깅이 불렸는지"를 검증하는 것은 change-detector의 대표적 함정이다.
 */
@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);

  log(message: string): void {
    this.logger.log(message);
  }
}
