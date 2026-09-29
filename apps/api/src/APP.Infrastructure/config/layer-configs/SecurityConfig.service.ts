import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityConfigService {
  constructor(private readonly config: ConfigService) {}

  get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  get accessTokenExpiresIn(): string {
    return this.config.get<string>('JWT_ACCESS_TTL', '15m');
  }

  get refreshTokenExpiresIn(): string {
    return this.config.get<string>('JWT_REFRESH_TTL', '7d');
  }

  get issuer(): string {
    return 'lashkoi-api';
  }
}
