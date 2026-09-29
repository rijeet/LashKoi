import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IncidentStatus } from '@shared/enums/IncidentStatus.enum';
import { localized, pickLang } from '@shared/utils/lang.util';

const HEALTH_CODES = ['dengue', 'measles'] as const;

@Injectable()
export class StatsAnalyticsService {
  constructor(private readonly db: AppDbContext) {}

  async healthByDistrict(
    query: Record<string, string | undefined>,
    lang?: string,
  ) {
    const l = pickLang(lang);
    const days = Math.min(Math.max(Number(query.days ?? 30), 1), 365);
    const typeCodes = this.parseHealthTypes(query.types ?? query.type);
    const params: unknown[] = [IncidentStatus.PUBLISHED, days];
    let p = 3;
    let sql = `
      SELECT i.district_pcode AS pcode,
        t.code AS type_code,
        COALESCE(SUM(i.case_count), COUNT(*))::int AS cases
      FROM incidents i
      JOIN incident_types t ON t.id = i.type_id
      WHERE i.status = $1 AND i.deleted_at IS NULL
        AND t.is_health = true
        AND i.occurred_at >= NOW() - ($2::int || ' days')::interval
    `;
    if (typeCodes.length) {
      sql += ` AND t.code = ANY($${p++})`;
      params.push(typeCodes);
    }
    if (query.division) {
      sql += ` AND i.division_pcode = $${p++}`;
      params.push(query.division);
    }
    if (query.from) {
      sql += ` AND i.occurred_at >= $${p++}::timestamptz`;
      params.push(query.from);
    }
    if (query.to) {
      sql += ` AND i.occurred_at < $${p++}::timestamptz`;
      params.push(query.to);
    }
    sql += ` GROUP BY i.district_pcode, t.code`;

    const rows = await this.db.incidents.query<
      Array<{ pcode: string; type_code: string; cases: number }>
    >(sql, params);

    const byDistrict = new Map<
      string,
      { dengue: number; measles: number; total: number }
    >();
    for (const row of rows) {
      const entry = byDistrict.get(row.pcode) ?? {
        dengue: 0,
        measles: 0,
        total: 0,
      };
      const n = Number(row.cases);
      if (row.type_code === 'dengue') entry.dengue += n;
      if (row.type_code === 'measles') entry.measles += n;
      entry.total += n;
      byDistrict.set(row.pcode, entry);
    }

    const pcodes = [...byDistrict.keys()];
    const areaByPcode = await this.areaNames(pcodes, l);
    let maxTotal = 0;
    const districts = pcodes
      .map((pcode) => {
        const counts = byDistrict.get(pcode)!;
        maxTotal = Math.max(maxTotal, counts.total);
        return {
          pcode,
          name: areaByPcode.get(pcode) ?? pcode,
          ...counts,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      days,
      types: typeCodes.length ? typeCodes : [...HEALTH_CODES],
      districts,
      maxTotal,
      updatedAt: new Date().toISOString(),
    };
  }

  async analyticsOverview(
    query: Record<string, string | undefined>,
    lang?: string,
  ) {
    const l = pickLang(lang);
    const days = Math.min(Math.max(Number(query.days ?? 30), 1), 365);
    const baseParams: unknown[] = [IncidentStatus.PUBLISHED, days];

    const byType = await this.db.incidents.query<
      Array<{ code: string; label_en: string; label_bn: string; count: string }>
    >(
      `SELECT t.code, t.label_en, t.label_bn, COUNT(*)::int AS count
       FROM incidents i
       JOIN incident_types t ON t.id = i.type_id
       WHERE i.status = $1 AND i.deleted_at IS NULL
         AND i.occurred_at >= NOW() - ($2::int || ' days')::interval
       GROUP BY t.code, t.label_en, t.label_bn
       ORDER BY count DESC`,
      baseParams,
    );

    const byDivision = await this.db.incidents.query<
      Array<{ pcode: string; count: string }>
    >(
      `SELECT i.division_pcode AS pcode, COUNT(*)::int AS count
       FROM incidents i
       WHERE i.status = $1 AND i.deleted_at IS NULL
         AND i.occurred_at >= NOW() - ($2::int || ' days')::interval
       GROUP BY i.division_pcode
       ORDER BY count DESC
       LIMIT 12`,
      baseParams,
    );

    const byDay = await this.db.incidents.query<
      Array<{ day: Date; count: string }>
    >(
      `SELECT (i.occurred_at AT TIME ZONE 'Asia/Dhaka')::date AS day, COUNT(*)::int AS count
       FROM incidents i
       WHERE i.status = $1 AND i.deleted_at IS NULL
         AND i.occurred_at >= NOW() - ($2::int || ' days')::interval
       GROUP BY day
       ORDER BY day ASC`,
      baseParams,
    );

    const healthTop = await this.healthByDistrict({ days: String(days) }, lang);

    const divPcodes = byDivision.map((r) => r.pcode);
    const divNames = await this.areaNames(divPcodes, l);

    const total = byType.reduce((s, r) => s + Number(r.count), 0);

    return {
      days,
      total,
      byType: byType.map((r) => ({
        code: r.code,
        label: localized(l, r.label_en, r.label_bn),
        count: Number(r.count),
      })),
      byDivision: byDivision.map((r) => ({
        pcode: r.pcode,
        name: divNames.get(r.pcode) ?? r.pcode,
        count: Number(r.count),
      })),
      byDay: byDay.map((r) => ({
        date:
          r.day instanceof Date
            ? r.day.toISOString().slice(0, 10)
            : String(r.day),
        count: Number(r.count),
      })),
      healthDistrictsTop: healthTop.districts.slice(0, 10),
      updatedAt: new Date().toISOString(),
    };
  }

  private parseHealthTypes(raw?: string): string[] {
    if (!raw?.trim()) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((c) => (HEALTH_CODES as readonly string[]).includes(c));
  }

  private async areaNames(pcodes: string[], lang: ReturnType<typeof pickLang>) {
    const map = new Map<string, string>();
    if (!pcodes.length) return map;
    const rows = await this.db.adminAreas
      .createQueryBuilder('a')
      .where('a.pcode IN (:...pcodes)', { pcodes })
      .getMany();
    for (const area of rows) {
      map.set(area.pcode, localized(lang, area.nameEn, area.nameBn));
    }
    return map;
  }
}
