import { HttpStatus, Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IncidentStatus } from '@shared/enums/IncidentStatus.enum';
import { localized, pickLang } from '@shared/utils/lang.util';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';
import { incidentSearchWhereSql } from '@shared/utils/incidentSearch.util';

@Injectable()
export class IncidentQueryService {
  constructor(private readonly db: AppDbContext) {}

  async listTypes(lang?: string) {
    const l = pickLang(lang);
    const rows = await this.db.incidentTypes.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return rows.map((t) => ({
      code: t.code,
      label: localized(l, t.labelEn, t.labelBn),
      iconKey: t.iconKey,
      iconUrl: t.iconUrl,
      markerColor: t.markerColor,
      isHealth: t.isHealth,
      contentWarning: t.contentWarning,
      sortOrder: t.sortOrder,
    }));
  }

  async statsSummary(
    lang?: string,
    range?: { from?: string; to?: string },
  ) {
    const l = pickLang(lang);
    const types = await this.db.incidentTypes.find({ where: { isActive: true } });
    const byType = [];
    let total = 0;
    for (const t of types) {
      const countQb = this.db.incidents
        .createQueryBuilder('i')
        .where('i.type_id = :typeId', { typeId: t.id })
        .andWhere('i.status = :status', { status: IncidentStatus.PUBLISHED })
        .andWhere('i.deleted_at IS NULL');
      if (range?.from) {
        countQb.andWhere('i.occurred_at >= :from', { from: range.from });
      }
      if (range?.to) {
        countQb.andWhere('i.occurred_at < :to', { to: range.to });
      }
      const countRow = await countQb
        .select(
          t.isHealth
            ? 'COALESCE(SUM(i.case_count), COUNT(*))::int'
            : 'COUNT(*)::int',
          'count',
        )
        .getRawOne<{ count: string }>();

      const last30 = await this.db.incidents
        .createQueryBuilder('i')
        .where('i.type_id = :typeId', { typeId: t.id })
        .andWhere('i.status = :status', { status: IncidentStatus.PUBLISHED })
        .andWhere('i.deleted_at IS NULL')
        .andWhere(`i.occurred_at >= NOW() - INTERVAL '30 days'`)
        .select('COUNT(*)::int', 'count')
        .getRawOne<{ count: string }>();

      const count = Number(countRow?.count ?? 0);
      total += count;
      byType.push({
        code: t.code,
        label: localized(l, t.labelEn, t.labelBn),
        count,
        last30Days: Number(last30?.count ?? 0),
        markerColor: t.markerColor,
      });
    }
    return { total, byType, updatedAt: new Date().toISOString() };
  }

  async listIncidentsGeoJson(query: Record<string, string | undefined>, lang?: string) {
    const l = pickLang(lang);
    const limit = Math.min(Number(query.limit ?? 500), 2000);
    const params: unknown[] = [IncidentStatus.PUBLISHED];
    let sql = `
      SELECT i.id, i.ref_code, i.slug, i.title_en, i.title_bn, i.summary_en, i.summary_bn,
        i.occurred_at, i.source_label, i.place_name_en, i.place_name_bn, i.banner_caption_en,
        i.banner_caption_bn, i.case_count, i.division_pcode, i.district_pcode,
        t.code as type_code, t.marker_color, t.icon_key, t.is_health,
        ST_X(i.location::geometry) as lng, ST_Y(i.location::geometry) as lat
      FROM incidents i
      JOIN incident_types t ON t.id = i.type_id
      WHERE i.status = $1 AND i.deleted_at IS NULL
    `;
    let p = 2;
    if (query.types) {
      const codes = query.types.split(',').map((s) => s.trim());
      sql += ` AND t.code = ANY($${p++})`;
      params.push(codes);
    }
    if (query.division) {
      sql += ` AND i.division_pcode = $${p++}`;
      params.push(query.division);
    }
    if (query.district) {
      sql += ` AND i.district_pcode = $${p++}`;
      params.push(query.district);
    }
    if (query.upazila) {
      sql += ` AND i.upazila_pcode = $${p++}`;
      params.push(query.upazila);
    }
    if (query.q?.trim()) {
      const search = incidentSearchWhereSql('i', query.q, p);
      sql += search.sql;
      params.push(...search.params);
      p = search.nextIndex;
    }
    if (query.date) {
      sql += ` AND (i.occurred_at AT TIME ZONE 'Asia/Dhaka')::date = $${p++}::date`;
      params.push(query.date);
    }
    sql += ` ORDER BY i.occurred_at DESC LIMIT $${p}`;
    params.push(limit);

    const rows = await this.db.incidents.query(sql, params);
    const incidentIds = rows.map((r: { id: string }) => r.id);
    const mediaByIncident = await this.mediaMapBatch(incidentIds);
    const pcodes = new Set<string>();
    for (const row of rows) {
      if (row.division_pcode) pcodes.add(row.division_pcode as string);
      if (row.district_pcode) pcodes.add(row.district_pcode as string);
    }
    const areaByPcode = await this.areaBriefBatch([...pcodes], l);

    const features = rows.map((row: Record<string, unknown>) => {
      const id = row.id as string;
      const divisionPcode = row.division_pcode as string;
      const districtPcode = row.district_pcode as string;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(row.lng), Number(row.lat)],
        },
        properties: {
          id: row.id,
          refCode: row.ref_code,
          slug: row.slug,
          type: row.type_code,
          markerColor: row.marker_color,
          iconKey: row.icon_key,
          headline: localized(l, row.title_en as string, row.title_bn as string),
          occurredAt: row.occurred_at,
          source: row.source_label,
          placeName: localized(
            l,
            row.place_name_en as string,
            row.place_name_bn as string,
          ),
          division: areaByPcode.get(divisionPcode) ?? {
            pcode: divisionPcode,
            name: divisionPcode,
          },
          district: areaByPcode.get(districtPcode) ?? {
            pcode: districtPcode,
            name: districtPcode,
          },
          description: localized(
            l,
            row.summary_en as string,
            row.summary_bn as string,
          ),
          media: mediaByIncident.get(id) ?? {},
          bannerCaption: localized(
            l,
            row.banner_caption_en as string,
            row.banner_caption_bn as string,
          ),
          caseCount: row.case_count,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
      meta: { count: features.length, limit, truncated: features.length >= limit },
    };
  }

  async getBySlug(slugOrId: string, lang?: string) {
    const l = pickLang(lang);
    const incident = await this.db.incidents.findOne({
      where: [{ slug: slugOrId }, { id: slugOrId }],
      relations: { type: true, media: true },
    });
    if (!incident || incident.status !== IncidentStatus.PUBLISHED || incident.deletedAt) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    const loc = await this.db.incidents.query(
      `SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat FROM incidents WHERE id = $1`,
      [incident.id],
    );
    const media = await this.mediaMap(incident.id);
    return {
      id: incident.id,
      refCode: incident.refCode,
      slug: incident.slug,
      type: incident.type.code,
      markerColor: incident.type.markerColor,
      iconKey: incident.type.iconKey,
      headline: localized(l, incident.titleEn, incident.titleBn),
      occurredAt: incident.occurredAt,
      source: incident.sourceLabel,
      sourceUrl: incident.sourceUrl,
      placeName: localized(l, incident.placeNameEn, incident.placeNameBn),
      description: localized(l, incident.summaryEn, incident.summaryBn),
      bodyHtml: incident.bodyHtml,
      location: {
        lat: Number(loc[0]?.lat),
        lng: Number(loc[0]?.lng),
      },
      division: await this.areaBrief(incident.divisionPcode, l),
      district: await this.areaBrief(incident.districtPcode, l),
      upazila: incident.upazilaPcode
        ? await this.areaBrief(incident.upazilaPcode, l)
        : null,
      union: incident.unionPcode ? await this.areaBrief(incident.unionPcode, l) : null,
      media,
      bannerCaption: localized(
        l,
        incident.bannerCaptionEn,
        incident.bannerCaptionBn,
      ),
      caseCount: incident.caseCount,
      publishedAt: incident.publishedAt,
      updatedAt: incident.updatedAt,
      alternateSlugs: { en: incident.slug, bn: incident.slug },
    };
  }

  async listDays(query: Record<string, string | undefined>) {
    const limit = Math.min(Number(query.limit ?? 30), 90);
    let sql = `
      SELECT (i.occurred_at AT TIME ZONE 'Asia/Dhaka')::date as day, COUNT(*)::int as count
      FROM incidents i
      JOIN incident_types t ON t.id = i.type_id
      WHERE i.status = $1 AND i.deleted_at IS NULL
    `;
    const params: unknown[] = [IncidentStatus.PUBLISHED];
    let p = 2;
    if (query.types) {
      sql += ` AND t.code = ANY($${p++})`;
      params.push(query.types.split(',').map((s) => s.trim()));
    }
    if (query.division) {
      sql += ` AND i.division_pcode = $${p++}`;
      params.push(query.division);
    }
    if (query.before) {
      sql += ` AND (i.occurred_at AT TIME ZONE 'Asia/Dhaka')::date < $${p++}::date`;
      params.push(query.before);
    }
    sql += ` GROUP BY day ORDER BY day DESC LIMIT $${p}`;
    params.push(limit);
    const rows = await this.db.incidents.query(sql, params);
    return rows.map((r: { day: Date; count: number }) => ({
      date: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      count: Number(r.count),
    }));
  }

  private async mediaMap(incidentId: string) {
    const rows = await this.db.incidentMedia.find({ where: { incidentId } });
    const media: Record<string, string> = {};
    for (const m of rows) {
      media[m.kind] = m.url;
    }
    return media;
  }

  private async mediaMapBatch(incidentIds: string[]) {
    const map = new Map<string, Record<string, string>>();
    if (!incidentIds.length) return map;
    const rows = await this.db.incidentMedia
      .createQueryBuilder('m')
      .where('m.incident_id IN (:...ids)', { ids: incidentIds })
      .getMany();
    for (const m of rows) {
      const existing = map.get(m.incidentId) ?? {};
      existing[m.kind] = m.url;
      map.set(m.incidentId, existing);
    }
    return map;
  }

  private async areaBrief(pcode: string, lang: ReturnType<typeof pickLang>) {
    const batch = await this.areaBriefBatch([pcode], lang);
    return batch.get(pcode) ?? { pcode, name: pcode };
  }

  private async areaBriefBatch(pcodes: string[], lang: ReturnType<typeof pickLang>) {
    const map = new Map<string, { pcode: string; name: string }>();
    if (!pcodes.length) return map;
    const rows = await this.db.adminAreas
      .createQueryBuilder('a')
      .where('a.pcode IN (:...pcodes)', { pcodes })
      .getMany();
    for (const area of rows) {
      map.set(area.pcode, {
        pcode: area.pcode,
        name: localized(lang, area.nameEn, area.nameBn),
      });
    }
    return map;
  }
}
