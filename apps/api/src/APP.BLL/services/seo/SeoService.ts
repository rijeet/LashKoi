import { HttpStatus, Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ApiConfigService } from '@infra/config/layer-configs/ApiConfig.service';
import { IncidentStatus } from '@shared/enums/IncidentStatus.enum';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

@Injectable()
export class SeoService {
  constructor(
    private readonly db: AppDbContext,
    private readonly apiConfig: ApiConfigService,
  ) {}

  async incidentMeta(slug: string) {
    const incident = await this.db.incidents.findOne({
      where: { slug, status: IncidentStatus.PUBLISHED },
      relations: { media: true },
    });
    if (!incident || incident.deletedAt) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    const base = this.apiConfig.publicSiteUrl.replace(/\/$/, '');
    const canonical = `${base}/en/incidents/${incident.slug}`;
    const image = incident.media?.find((m) => m.kind === 'image')?.url;
    return {
      title: `${incident.titleEn} | LashKoi`,
      description: incident.summaryEn?.slice(0, 160),
      canonical,
      ogImage: image ?? null,
      alternates: {
        en: `${base}/en/incidents/${incident.slug}`,
        bn: `${base}/bn/incidents/${incident.slug}`,
      },
      jsonLd: {
        '@type': 'NewsArticle',
        headline: incident.titleEn,
        datePublished: incident.publishedAt,
      },
    };
  }

  async sitemapXml(): Promise<string> {
    const base = this.apiConfig.sitemapBaseUrl.replace(/\/$/, '');
    const incidents = await this.db.incidents.find({
      where: { status: IncidentStatus.PUBLISHED },
      select: ['slug', 'updatedAt'],
    });
    const urls = [
      `<url><loc>${base}/</loc></url>`,
      `<url><loc>${base}/en</loc></url>`,
      `<url><loc>${base}/bn</loc></url>`,
      ...incidents.flatMap((i) => [
        `<url><loc>${base}/en/incidents/${i.slug}</loc><lastmod>${i.updatedAt.toISOString()}</lastmod></url>`,
        `<url><loc>${base}/bn/incidents/${i.slug}</loc><lastmod>${i.updatedAt.toISOString()}</lastmod></url>`,
      ]),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  }

  robotsTxt(): string {
    const base = this.apiConfig.sitemapBaseUrl.replace(/\/$/, '');
    return `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${base}/sitemap.xml\n`;
  }
}
