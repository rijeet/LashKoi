import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { SecurityConfigService } from '@infra/config/layer-configs/SecurityConfig.service';
import type {
  AccessTokenClaims,
  IJwtService,
  RefreshTokenClaims,
  VerifiedJwtPayload,
} from '@shared/interfaces/security/IJwtService.interface';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';
import { HttpStatus } from '@nestjs/common';

const ALGORITHM = 'HS256' as const;

@Injectable()
export class JwtService implements IJwtService {
  constructor(private readonly security: SecurityConfigService) {}

  generateAccessToken(payload: AccessTokenClaims): string {
    return jwt.sign(
      {
        sub: payload.sub,
        sid: payload.sid,
        role: payload.role,
        email: payload.email,
        aud: 'access',
        iss: this.security.issuer,
      },
      this.security.jwtSecret,
      {
        expiresIn: this.security.accessTokenExpiresIn,
        algorithm: ALGORITHM,
      } as SignOptions,
    );
  }

  generateRefreshToken(payload: RefreshTokenClaims): string {
    return jwt.sign(
      {
        sub: payload.sub,
        sid: payload.sid,
        aud: 'refresh',
        iss: this.security.issuer,
      },
      this.security.jwtSecret,
      {
        expiresIn: this.security.refreshTokenExpiresIn,
        algorithm: ALGORITHM,
      } as SignOptions,
    );
  }

  verifyToken(token: string, type: 'access' | 'refresh'): VerifiedJwtPayload {
    try {
      const decoded = jwt.verify(token, this.security.jwtSecret, {
        algorithms: [ALGORITHM],
        issuer: this.security.issuer,
      }) as jwt.JwtPayload;

      if (decoded.aud !== type) {
        throw new Error('aud');
      }
      if (!decoded.sub || !decoded.sid) {
        throw new Error('claims');
      }
      return {
        sub: decoded.sub,
        sid: decoded.sid,
        role: decoded.role as string | undefined,
        email: decoded.email as string | undefined,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired token',
        ErrorCode.UNAUTHORIZED,
      );
    }
  }
}
