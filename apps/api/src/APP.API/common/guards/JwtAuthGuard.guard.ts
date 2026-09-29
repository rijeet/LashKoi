import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IJwtService as IJwtServiceToken,
  IRevocationRegistry as IRevocationRegistryToken,
} from '@shared/tokens/injection.tokens';
import type { IJwtService } from '@shared/interfaces/security/IJwtService.interface';
import type { ICurrentUser } from '@shared/interfaces/domain/ICurrentUser.interface';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    @Inject(IRevocationRegistryToken)
    private readonly revocation: { isRevoked(sessionId: string): boolean },
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractAccessToken(request);
    if (!token) {
      throw new UnauthorizedException({
        message: 'Missing authentication token',
        error: { code: ErrorCode.UNAUTHORIZED },
      });
    }

    const payload = this.jwt.verifyToken(token, 'access');
    if (this.revocation.isRevoked(payload.sid)) {
      throw new UnauthorizedException({
        message: 'Invalid or expired session',
        error: { code: ErrorCode.UNAUTHORIZED },
      });
    }

    const user: ICurrentUser = {
      userId: payload.sub,
      sessionId: payload.sid,
      email: payload.email ?? '',
      role: payload.role ?? 'admin',
    };
    (request as Request & { user: ICurrentUser }).user = user;
    return true;
  }

  private extractAccessToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
