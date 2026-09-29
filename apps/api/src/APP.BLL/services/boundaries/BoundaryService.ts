import { HttpStatus, Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { Inject } from '@nestjs/common';
import { ICacheService as ICacheServiceToken } from '@shared/tokens/injection.tokens';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';
import { localized, pickLang, type Lang } from '@shared/utils/lang.util';

@Injectable()
export class BoundaryService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(ICacheServiceToken)
    private readonly cache: {
      get(key: string): Promise<string | null>;
      set(key: string, value: string, ttlSeconds: number): Promise<void>;
    },
  ) {}

  async listDivisions(lang?: string) {
    return this.listChildren(null, 'division', lang);
  }

  async listDistricts(divisionPcode: string, lang?: string) {
    await this.ensureExists(divisionPcode);
    return this.listChildren(divisionPcode, 'district', lang);
  }

  async listUpazilas(districtPcode: string, lang?: string) {
    await this.ensureExists(districtPcode);
    return this.listChildren(districtPcode, 'upazila', lang);
  }

  async listUnions(upazilaPcode: string, lang?: string) {
    await this.ensureExists(upazilaPcode);
    return this.listChildren(upazilaPcode, 'union', lang);
  }

  async getByPcode(pcode: string, lang?: string) {
    const area = await this.db.adminAreas.findOne({ where: { pcode } });
    if (!area) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    const l = pickLang(lang);
    const breadcrumb = await this.buildBreadcrumb(area, l);
    return {
      ...this.mapArea(area, l),
      breadcrumb,
    };
  }

  private async listChildren(parent: string | null, level: string, lang?: string) {
    const cacheKey = `boundaries:v1:${level}:${parent ?? 'root'}:${lang ?? 'en'}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows = await this.db.adminAreas.find({
      where: parent ? { parentPcode: parent, level } : { level },
      order: { nameEn: 'ASC' },
    });
    const l = pickLang(lang);
    const data = rows.map((r) => this.mapArea(r, l));
    await this.cache.set(cacheKey, JSON.stringify(data), 86400);
    return data;
  }

  private mapArea(
    row: {
      pcode: string;
      nameEn: string;
      nameBn?: string | null;
      bboxWest?: number | null;
      bboxSouth?: number | null;
      bboxEast?: number | null;
      bboxNorth?: number | null;
    },
    lang: Lang,
  ) {
    const name = localized(lang, row.nameEn, row.nameBn);
    let bbox: [number, number, number, number] | null =
      row.bboxWest != null &&
      row.bboxSouth != null &&
      row.bboxEast != null &&
      row.bboxNorth != null
        ? [row.bboxWest!, row.bboxSouth!, row.bboxEast!, row.bboxNorth!]
        : null;

    let centroid: { lat: number; lng: number } | null = null;
    const withCentroid = row as {
      centroid?: { coordinates?: [number, number] } | null;
    };
    const coords = withCentroid.centroid?.coordinates;
    if (coords?.length === 2) {
      centroid = { lng: coords[0], lat: coords[1] };
      if (!bbox) {
        const pad = 0.35;
        bbox = [
          coords[0] - pad,
          coords[1] - pad,
          coords[0] + pad,
          coords[1] + pad,
        ];
      }
    }

    return {
      pcode: row.pcode,
      name,
      nameEn: row.nameEn,
      nameBn: row.nameBn ?? row.nameEn,
      centroid,
      bbox,
    };
  }

  private async buildBreadcrumb(
    area: { pcode: string; level: string; parentPcode?: string | null },
    lang: Lang,
  ) {
    const chain: { pcode: string; name: string; level: string }[] = [];
    let current = area;
    for (let i = 0; i < 5 && current; i++) {
      const row = await this.db.adminAreas.findOne({ where: { pcode: current.pcode } });
      if (!row) break;
      chain.unshift({
        pcode: row.pcode,
        name: localized(lang, row.nameEn, row.nameBn),
        level: row.level,
      });
      if (!row.parentPcode) break;
      current = { pcode: row.parentPcode, level: '', parentPcode: null };
    }
    return chain;
  }

  private async ensureExists(pcode: string) {
    const exists = await this.db.adminAreas.exist({ where: { pcode } });
    if (!exists) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
  }
}
