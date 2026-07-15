import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * 데모용 최소 인증 가드. "계약 — 인증 분기" 체크리스트 항목을 API 테스트에서
 * 보여주기 위한 것 (x-api-key 헤더가 없으면 401).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.headers['x-api-key'] !== 'secret-key') {
      throw new UnauthorizedException();
    }
    return true;
  }
}
