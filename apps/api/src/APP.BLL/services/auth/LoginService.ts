import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { SessionService } from './SessionService';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

const DUMMY_HASH =
  '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class LoginService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IPasswordHasherToken)
    private readonly hasher: { verify(plain: string, hash: string): Promise<boolean> },
    private readonly sessions: SessionService,
  ) {}

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.db.users.findOne({ where: { email } });
    if (!user) {
      await this.hasher.verify(password, DUMMY_HASH);
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Invalid credentials',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiHttpException(
        HttpStatus.LOCKED,
        'Account locked',
        ErrorCode.ACCOUNT_LOCKED,
      );
    }

    const ok = await this.hasher.verify(password, user.passwordHash);
    if (!ok) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 10) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.db.users.save(user);
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'Invalid credentials',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    if (!user.isActive) {
      throw new ApiHttpException(HttpStatus.FORBIDDEN, 'Forbidden', ErrorCode.FORBIDDEN);
    }

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.db.users.save(user);

    const tokens = await this.sessions.createSession(user, ip, userAgent);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
