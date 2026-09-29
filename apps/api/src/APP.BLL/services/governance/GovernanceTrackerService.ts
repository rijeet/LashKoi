import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IncidentStatus } from '@shared/enums/IncidentStatus.enum';
import { localized, pickLang } from '@shared/utils/lang.util';
import { incidentSearchWhereSql } from '@shared/utils/incidentSearch.util';
import { ApiConfigService } from '@infra/config/layer-configs/ApiConfig.service';
import { BannerService } from '@bll/services/banners/BannerService';

@Injectable()
export class GovernanceTrackerService {
  constructor(
    private readonly db: AppDbContext,
    private readonly apiConfig: ApiConfigService,
    private readonly banners: BannerService,
  ) {}

  async getTracker(query: Record<string, string | undefined>) {
    const locale = pickLang(query.locale ?? query.lang);
    const incidentLimit = Math.min(
      Math.max(Number(query.incidentLimit ?? 12), 1),
      50,
    );
    const typeFilter = query.category ?? query.type;

    const types = await this.db.incidentTypes.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    const typeCounts = await this.db.incidents.query<
      Array<{ code: string; count: string }>
    >(
      `SELECT t.code, COUNT(*)::int AS count
       FROM incidents i
       JOIN incident_types t ON t.id = i.type_id
       WHERE i.status = $1 AND i.deleted_at IS NULL
       GROUP BY t.code`,
      [IncidentStatus.PUBLISHED],
    );
    const countByCode = new Map(
      typeCounts.map((r) => [r.code, Number(r.count)]),
    );

    const categories = types.map((t) => ({
      id: t.id,
      slug: t.code,
      code: t.code,
      name: localized(locale, t.labelEn, t.labelBn),
      incidentCount: countByCode.get(t.code) ?? 0,
      subcategories: [] as unknown[],
    }));

    const params: unknown[] = [IncidentStatus.PUBLISHED];
    let p = 2;
    let sql = `
      SELECT i.id, i.ref_code, i.slug, i.title_en, i.title_bn, i.summary_en, i.summary_bn,
        i.place_name_en, i.place_name_bn, i.occurred_at, i.updated_at,
        t.code AS type_code, t.label_en, t.label_bn
      FROM incidents i
      JOIN incident_types t ON t.id = i.type_id
      WHERE i.status = $1 AND i.deleted_at IS NULL
    `;
    if (typeFilter) {
      sql += ` AND t.code = $${p++}`;
      params.push(typeFilter);
    }
    if (query.q?.trim()) {
      const search = incidentSearchWhereSql('i', query.q, p);
      sql += search.sql;
      params.push(...search.params);
      p = search.nextIndex;
    }
    sql += ` ORDER BY i.occurred_at DESC LIMIT $${p}`;
    params.push(incidentLimit);

    const rows = await this.db.incidents.query(sql, params);
    const incidentIds = rows.map((r: { id: string }) => r.id);
    const mediaRows = incidentIds.length
      ? await this.db.incidentMedia
          .createQueryBuilder('m')
          .where('m.incident_id IN (:...ids)', { ids: incidentIds })
          .andWhere("m.kind = 'image'")
          .getMany()
      : [];
    const thumbByIncident = new Map(
      mediaRows.map((m) => [m.incidentId, m.url]),
    );

    const site = this.apiConfig.publicSiteUrl.replace(/\/$/, '');
    const langPath = locale === 'bn' ? 'bn' : 'en';

    const incidents = rows.map((row: Record<string, unknown>) => {
      const id = row.id as string;
      const slug = row.slug as string;
      const title = localized(
        locale,
        row.title_en as string,
        row.title_bn as string,
      );
      const summary = localized(
        locale,
        row.summary_en as string,
        row.summary_bn as string,
      );
      const typeCode = row.type_code as string;
      return {
        id,
        slug,
        refCode: row.ref_code,
        title,
        category: {
          slug: typeCode,
          code: typeCode,
          name: localized(
            locale,
            row.label_en as string,
            row.label_bn as string,
          ),
        },
        type: {
          code: typeCode,
          label: localized(
            locale,
            row.label_en as string,
            row.label_bn as string,
          ),
        },
        placeName: localized(
          locale,
          row.place_name_en as string,
          row.place_name_bn as string,
        ),
        summary,
        occurredAt: row.occurred_at,
        updatedAt: row.updated_at,
        thumbnailUrl: thumbByIncident.get(id) ?? null,
        detailUrl: `${site}/${langPath}/incidents/${slug}`,
        latestNewsItem: {
          slug,
          headline: title,
          thumbnailUrl: thumbByIncident.get(id) ?? null,
          description: summary,
          descriptionContentType: 'TEXT',
        },
      };
    });

    const featuredBanners = await this.banners.listFeatured(locale);

    return {
      locale,
      categories,
      types: categories,
      incidents,
      featuredBanners,
      generatedAt: new Date().toISOString(),
    };
  }
}
