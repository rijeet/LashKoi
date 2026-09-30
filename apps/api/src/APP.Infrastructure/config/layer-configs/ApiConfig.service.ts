import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return Number(this.config.get('PORT', 3000));
  }

  get corsOrigins(): string[] {
    const raw = this.config.get<string>(
      'CORS_ORIGINS',
      'http://localhost:5173,http://127.0.0.1:5173',
    );
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  get publicSiteUrl(): string {
    return this.config.get<string>('PUBLIC_SITE_URL', 'http://localhost:5173');
  }

  get sitemapBaseUrl(): string {
    return this.config.get<string>('SITEMAP_BASE_URL', this.publicSiteUrl);
  }

  get swaggerEnabled(): boolean {
    const v = this.config.get<string>('SWAGGER_ENABLED', 'true');
    return v !== 'false' && v !== '0';
  }

  /** When set, GET /governance/tracker requires matching X-Partner-Key header. */
  get governancePartnerKey(): string | null {
    const raw = this.config.get<string>('GOVERNANCE_PARTNER_KEY', '');
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  }
}
