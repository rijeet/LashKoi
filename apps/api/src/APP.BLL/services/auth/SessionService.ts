import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { TokenService } from './TokenService';
import {
  IJwtService as IJwtServiceToken,
  IRevocationRegistry as IRevocationRegistryToken,
} from '@shared/tokens/injection.tokens';
import type { IJwtService } from '@shared/interfaces/security/IJwtService.interface';
import { digestRefreshToken } from '@shared/utils/tokenDigest.util';
import { parseJwtExpiryToMs } from '@shared/utils/jwtExpiry.util';
import { SecurityConfigService } from '@infra/config/layer-configs/SecurityConfig.service';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionService {
  constructor(
    private readonly db: AppDbContext,
    private readonly tokenService: TokenService,
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    @Inject(IRevocationRegistryToken)
    private readonly revocation: {
      revokeSession(sessionId: string, userId: string): void;
    },
    private readonly security: SecurityConfigService,
  ) {}

  async createSession(
    user: SysUsers,
    ip?: string,
    userAgent?: string,
  ): Promise<ReturnType<TokenService['issueForUser']> & { familyId: string }> {
    const { sessionId, familyId } = this.tokenService.newSessionIds();
    const tokens = this.tokenService.issueForUser(user, sessionId);
    const session = this.db.userSessions.create({
      id: sessionId,
      userId: user.id,
      familyId,
      refreshTokenHash: digestRefreshToken(tokens.refreshToken),
      expiresAt: this.refreshExpiry(),
      ip,
      userAgent,
    });
    await this.db.userSessions.save(session);
    return { ...tokens, familyId };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = this.jwt.verifyToken(refreshToken, 'refresh');
    } catch {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token invalid',
        ErrorCode.REFRESH_INVALID,
      );
    }

    const digest = digestRefreshToken(refreshToken);
    const session = await this.db.userSessions.findOne({
      where: { id: payload.sid, userId: payload.sub },
      relations: { user: true },
    });

    if (!session) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token invalid',
        ErrorCode.REFRESH_INVALID,
      );
    }

    if (session.revokedAt) {
      await this.revokeFamily(session.familyId, 'reuse_detected');
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token reused',
        ErrorCode.REFRESH_INVALID,
      );
    }

    if (session.refreshTokenHash !== digest) {
      await this.revokeFamily(session.familyId, 'reuse_detected');
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token invalid',
        ErrorCode.REFRESH_INVALID,
      );
    }

    if (session.expiresAt < new Date()) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token expired',
        ErrorCode.REFRESH_INVALID,
      );
    }

    const user = session.user;
    const newSessionId = randomUUID();
    const tokens = this.tokenService.issueForUser(user, newSessionId);

    session.revokedAt = new Date();
    session.revokeReason = 'rotated';
    session.replacedById = newSessionId;
    await this.db.userSessions.save(session);
    this.revocation.revokeSession(session.id, user.id);

    const next = this.db.userSessions.create({
      id: newSessionId,
      userId: user.id,
      familyId: session.familyId,
      refreshTokenHash: digestRefreshToken(tokens.refreshToken),
      expiresAt: this.refreshExpiry(),
      ip: session.ip,
      userAgent: session.userAgent,
    });
    await this.db.userSessions.save(next);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    };
  }

  async logout(sessionId: string, userId: string, refreshToken?: string) {
    const session = await this.db.userSessions.findOne({
      where: { id: sessionId, userId },
    });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      session.revokeReason = 'logout';
      await this.db.userSessions.save(session);
      this.revocation.revokeSession(sessionId, userId);
    }
    if (refreshToken) {
      const digest = digestRefreshToken(refreshToken);
      const byHash = await this.db.userSessions.findOne({
        where: { refreshTokenHash: digest, userId },
      });
      if (byHash && !byHash.revokedAt) {
        byHash.revokedAt = new Date();
        byHash.revokeReason = 'logout';
        await this.db.userSessions.save(byHash);
        this.revocation.revokeSession(byHash.id, userId);
      }
    }
  }

  async logoutAll(userId: string) {
    const sessions = await this.db.userSessions.find({
      where: { userId, revokedAt: IsNull() },
    });
    for (const s of sessions) {
      s.revokedAt = new Date();
      s.revokeReason = 'logout_all';
      await this.db.userSessions.save(s);
      this.revocation.revokeSession(s.id, userId);
    }
  }

  private async revokeFamily(familyId: string, reason: string) {
    const sessions = await this.db.userSessions.find({
      where: { familyId, revokedAt: IsNull() },
    });
    for (const s of sessions) {
      s.revokedAt = new Date();
      s.revokeReason = reason;
      await this.db.userSessions.save(s);
      this.revocation.revokeSession(s.id, s.userId);
    }
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + parseJwtExpiryToMs(this.security.refreshTokenExpiresIn));
  }
}
