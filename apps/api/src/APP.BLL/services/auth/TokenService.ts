import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import type { IJwtService } from '@shared/interfaces/security/IJwtService.interface';
import { SecurityConfigService } from '@infra/config/layer-configs/SecurityConfig.service';
import { parseJwtExpiryToSeconds } from '@shared/utils/jwtExpiry.util';
import { SysUsers } from '@entity/entities/SysUsers.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  sessionId: string;
  familyId: string;
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    private readonly security: SecurityConfigService,
  ) {}

  issueForUser(user: SysUsers, sessionId: string): Omit<TokenPair, 'familyId'> & { sessionId: string } {
    const accessToken = this.jwt.generateAccessToken({
      sub: user.id,
      sid: sessionId,
      role: user.role,
      email: user.email,
    });
    const refreshToken = this.jwt.generateRefreshToken({
      sub: user.id,
      sid: sessionId,
    });
    const expiresIn = parseJwtExpiryToSeconds(this.security.accessTokenExpiresIn);
    const refreshExpiresIn = parseJwtExpiryToSeconds(this.security.refreshTokenExpiresIn);
    return { accessToken, refreshToken, expiresIn, refreshExpiresIn, sessionId };
  }

  newSessionIds(): { sessionId: string; familyId: string } {
    const id = randomUUID();
    return { sessionId: id, familyId: id };
  }
}
