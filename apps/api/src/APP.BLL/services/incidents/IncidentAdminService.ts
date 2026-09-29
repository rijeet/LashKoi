import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { SlugService } from './SlugService';
import { MediaValidationService } from './MediaValidationService';
import { HtmlSanitizeService } from './HtmlSanitizeService';
import { RefCodeService } from './RefCodeService';
import { IncidentStatus } from '@shared/enums/IncidentStatus.enum';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';
import type { ICurrentUser } from '@shared/interfaces/domain/ICurrentUser.interface';
import { DistrictBoundaryValidationService } from '@bll/services/boundaries/DistrictBoundaryValidationService';
import { ICacheService as ICacheServiceToken } from '@shared/tokens/injection.tokens';
import type { CacheService } from '@infra/redis/CacheService.service';
import { IncidentAuditService } from './IncidentAuditService';
import { incidentSearchTypeOrmWhere } from '@shared/utils/incidentSearch.util';
import type { Incidents } from '@entity/entities/Incidents.entity';

@Injectable()
export class IncidentAdminService {
  private readonly slugService = new SlugService();
  private readonly mediaValidation = new MediaValidationService();
  private readonly htmlSanitize = new HtmlSanitizeService();
  private readonly refCode = new RefCodeService();

  constructor(
    private readonly db: AppDbContext,
    private readonly districtBoundaries: DistrictBoundaryValidationService,
    @Inject(ICacheServiceToken) private readonly cache: CacheService,
    private readonly audit: IncidentAuditService,
  ) {}

  async create(dto: Record<string, unknown>, user: ICurrentUser) {
    const type = await this.db.incidentTypes.findOne({
      where: { code: String(dto.type) },
    });
    if (!type) {
      throw new ApiHttpException(HttpStatus.BAD_REQUEST, 'Invalid type', ErrorCode.VALIDATION_ERROR);
    }
    await this.validatePcodeChain(dto);
    const location = dto.location as { lat: number; lng: number };
    await this.districtBoundaries.assertPointInDistrict(
      location.lat,
      location.lng,
      String(dto.districtPcode),
    );
    const titleEn = String(dto.titleEn ?? '');
    const baseSlug = dto.slug
      ? String(dto.slug)
      : this.slugService.slugify(titleEn);
    const slug = await this.slugService.ensureUnique(baseSlug, async (s) =>
      Boolean(await this.db.incidents.exist({ where: { slug: s } })),
    );
    const year = new Date().getFullYear();
    const seq = (await this.db.incidents.count()) + 1;
    const incident = this.db.incidents.create({
      refCode: this.refCode.format(year, seq),
      slug,
      typeId: type.id,
      createdById: user.userId,
      titleEn,
      titleBn: (dto.titleBn as string) ?? null,
      summaryEn: String(dto.summaryEn ?? ''),
      summaryBn: (dto.summaryBn as string) ?? null,
      bodyHtml: this.htmlSanitize.sanitize(dto.bodyHtml as string),
      placeNameEn: (dto.placeNameEn as string) ?? null,
      placeNameBn: (dto.placeNameBn as string) ?? null,
      location: 'SRID=4326;POINT(0 0)',
      divisionPcode: String(dto.divisionPcode),
      districtPcode: String(dto.districtPcode),
      upazilaPcode: (dto.upazilaPcode as string) ?? null,
      unionPcode: (dto.unionPcode as string) ?? null,
      sourceLabel: String(dto.sourceLabel ?? ''),
      sourceUrl: (dto.sourceUrl as string) ?? null,
      bannerCaptionEn: (dto.bannerCaptionEn as string) ?? null,
      bannerCaptionBn: (dto.bannerCaptionBn as string) ?? null,
      caseCount: (dto.caseCount as number) ?? null,
      status: IncidentStatus.DRAFT,
      occurredAt: new Date(String(dto.occurredAt)),
    });

    const saved = await this.db.incidents.save(incident);
    await this.db.incidents.query(
      `UPDATE incidents SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      [location.lng, location.lat, saved.id],
    );
    await this.upsertMedia(saved.id, dto.media as Record<string, string | null>);
    await this.audit.log(saved.id, 'created', user, {
      refCode: saved.refCode,
      slug: saved.slug,
      type: String(dto.type),
      status: saved.status,
    });
    return this.getAdminRecord(saved.id);
  }

  listAudit(incidentId: string) {
    return this.audit.listForIncident(incidentId);
  }

  async list(params: {
    status?: string;
    types?: string;
    division?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const qb = this.db.incidents
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.type', 'type')
      .where('i.deletedAt IS NULL');

    if (params.status) {
      qb.andWhere('i.status = :status', { status: params.status });
    }
    if (params.types) {
      const codes = params.types.split(',').map((c) => c.trim()).filter(Boolean);
      if (codes.length) qb.andWhere('type.code IN (:...codes)', { codes });
    }
    if (params.division) {
      qb.andWhere('i.divisionPcode = :division', { division: params.division });
    }
    if (params.q?.trim()) {
      const term = params.q.trim();
      qb.andWhere(incidentSearchTypeOrmWhere(), {
        term,
        pattern: `%${term}%`,
      });
    }

    qb.orderBy('i.updatedAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((incident) => ({
        id: incident.id,
        refCode: incident.refCode,
        slug: incident.slug,
        type: incident.type.code,
        status: incident.status,
        titleEn: incident.titleEn,
        divisionPcode: incident.divisionPcode,
        districtPcode: incident.districtPcode,
        occurredAt: incident.occurredAt,
        updatedAt: incident.updatedAt,
        publishedAt: incident.publishedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async patch(id: string, dto: Record<string, unknown>, user: ICurrentUser) {
    const incident = await this.db.incidents.findOne({ where: { id } });
    if (!incident || incident.deletedAt) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    const before = this.auditSnapshot(incident);
    if (dto.type) {
      const type = await this.db.incidentTypes.findOne({
        where: { code: String(dto.type) },
      });
      if (!type) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'Invalid type',
          ErrorCode.VALIDATION_ERROR,
        );
      }
      incident.typeId = type.id;
    }
    if (dto.titleEn) incident.titleEn = String(dto.titleEn);
    if (dto.titleBn !== undefined) incident.titleBn = (dto.titleBn as string) ?? null;
    if (dto.summaryEn) incident.summaryEn = String(dto.summaryEn);
    if (dto.summaryBn !== undefined) incident.summaryBn = (dto.summaryBn as string) ?? null;
    if (dto.bodyHtml !== undefined) {
      incident.bodyHtml = this.htmlSanitize.sanitize(dto.bodyHtml as string);
    }
    if (dto.placeNameEn !== undefined) {
      incident.placeNameEn = (dto.placeNameEn as string) ?? null;
    }
    if (dto.placeNameBn !== undefined) {
      incident.placeNameBn = (dto.placeNameBn as string) ?? null;
    }
    if (dto.sourceLabel) incident.sourceLabel = String(dto.sourceLabel);
    if (dto.sourceUrl !== undefined) incident.sourceUrl = (dto.sourceUrl as string) ?? null;
    if (dto.bannerCaptionEn !== undefined) {
      incident.bannerCaptionEn = (dto.bannerCaptionEn as string) ?? null;
    }
    if (dto.bannerCaptionBn !== undefined) {
      incident.bannerCaptionBn = (dto.bannerCaptionBn as string) ?? null;
    }
    if (dto.caseCount !== undefined) {
      incident.caseCount = (dto.caseCount as number) ?? null;
    }
    if (dto.divisionPcode && dto.districtPcode) {
      await this.validatePcodeChain(dto);
      incident.divisionPcode = String(dto.divisionPcode);
      incident.districtPcode = String(dto.districtPcode);
      incident.upazilaPcode = (dto.upazilaPcode as string) ?? null;
      incident.unionPcode = (dto.unionPcode as string) ?? null;
    }
    if (dto.occurredAt) incident.occurredAt = new Date(String(dto.occurredAt));
    await this.db.incidents.save(incident);
    const location = dto.location as { lat: number; lng: number } | undefined;
    if (location?.lat != null && location?.lng != null) {
      await this.db.incidents.query(
        `UPDATE incidents SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
        [location.lng, location.lat, id],
      );
      await this.districtBoundaries.assertPointInDistrict(
        location.lat,
        location.lng,
        incident.districtPcode,
      );
    }
    if (dto.media) {
      await this.upsertMedia(id, dto.media as Record<string, string | null>);
    }
    const after = this.auditSnapshot(
      (await this.db.incidents.findOne({ where: { id } }))!,
    );
    const diff = this.auditDiff(before, after);
    if (Object.keys(diff).length) {
      await this.audit.log(id, 'updated', user, diff);
    }
    return this.getAdminRecord(id);
  }

  async publish(id: string, user: ICurrentUser) {
    const incident = await this.db.incidents.findOne({
      where: { id },
      relations: { media: true },
    });
    if (!incident || incident.deletedAt) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    const coords = await this.readLocation(id);
    if (coords) {
      await this.districtBoundaries.assertPointInDistrict(
        coords.lat,
        coords.lng,
        incident.districtPcode,
      );
    }
    const hasImage = incident.media?.some((m) => m.kind === 'image');
    if (!hasImage && !incident.summaryEn) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'Summary or image required',
        ErrorCode.VALIDATION_ERROR,
      );
    }
    incident.status = IncidentStatus.PUBLISHED;
    if (!incident.publishedAt) incident.publishedAt = new Date();
    await this.db.incidents.save(incident);
    await this.audit.log(id, 'published', user, {
      status: incident.status,
      publishedAt: incident.publishedAt,
    });
    this.invalidatePublicCaches();
    return this.getAdminRecord(id);
  }

  async unpublish(id: string, user: ICurrentUser) {
    const incident = await this.db.incidents.findOne({ where: { id } });
    if (!incident || incident.deletedAt) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    incident.status = IncidentStatus.DRAFT;
    await this.db.incidents.save(incident);
    await this.audit.log(id, 'unpublished', user, { status: incident.status });
    this.invalidatePublicCaches();
    return this.getAdminRecord(id);
  }

  async softDelete(id: string, user: ICurrentUser) {
    const incident = await this.db.incidents.findOne({ where: { id } });
    if (!incident || incident.deletedAt) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    incident.deletedAt = new Date();
    incident.status = IncidentStatus.ARCHIVED;
    await this.db.incidents.save(incident);
    await this.audit.log(id, 'deleted', user, { deletedAt: incident.deletedAt });
    this.invalidatePublicCaches();
    return { deleted: true };
  }

  async getAdminRecord(id: string) {
    const incident = await this.db.incidents.findOne({
      where: { id },
      relations: { type: true, media: true },
    });
    if (!incident) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    const media: Record<string, string | null> = {};
    for (const m of incident.media ?? []) {
      media[m.kind] = m.url;
    }
    const [locRow] = await this.db.incidents.query(
      `SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
       FROM incidents WHERE id = $1`,
      [id],
    );
    const lat = locRow?.lat != null ? Number(locRow.lat) : null;
    const lng = locRow?.lng != null ? Number(locRow.lng) : null;

    return {
      id: incident.id,
      refCode: incident.refCode,
      slug: incident.slug,
      type: incident.type.code,
      status: incident.status,
      titleEn: incident.titleEn,
      titleBn: incident.titleBn,
      summaryEn: incident.summaryEn,
      summaryBn: incident.summaryBn,
      bodyHtml: incident.bodyHtml,
      placeNameEn: incident.placeNameEn,
      placeNameBn: incident.placeNameBn,
      location: lat != null && lng != null ? { lat, lng } : null,
      divisionPcode: incident.divisionPcode,
      districtPcode: incident.districtPcode,
      upazilaPcode: incident.upazilaPcode,
      unionPcode: incident.unionPcode,
      sourceLabel: incident.sourceLabel,
      sourceUrl: incident.sourceUrl,
      bannerCaptionEn: incident.bannerCaptionEn,
      bannerCaptionBn: incident.bannerCaptionBn,
      caseCount: incident.caseCount,
      occurredAt: incident.occurredAt,
      publishedAt: incident.publishedAt,
      updatedAt: incident.updatedAt,
      media,
    };
  }

  private async readLocation(
    incidentId: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const rows = await this.db.incidents.query<
      Array<{ lat: string; lng: string }>
    >(
      `SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
       FROM incidents WHERE id = $1`,
      [incidentId],
    );
    const row = rows[0];
    if (!row?.lat || !row?.lng) return null;
    return { lat: Number(row.lat), lng: Number(row.lng) };
  }

  private invalidatePublicCaches(): void {
    this.cache.clearMemoryByPrefix('boundaries:v1:');
  }

  private auditSnapshot(incident: Incidents) {
    return {
      typeId: incident.typeId,
      status: incident.status,
      titleEn: incident.titleEn,
      titleBn: incident.titleBn,
      summaryEn: incident.summaryEn,
      divisionPcode: incident.divisionPcode,
      districtPcode: incident.districtPcode,
      upazilaPcode: incident.upazilaPcode,
      unionPcode: incident.unionPcode,
      occurredAt: incident.occurredAt?.toISOString(),
      caseCount: incident.caseCount,
    };
  }

  private auditDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, { from: unknown; to: unknown }> {
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(after)) {
      const a = after[key];
      const b = before[key];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        diff[key] = { from: b, to: a };
      }
    }
    return diff;
  }

  private async validatePcodeChain(dto: Record<string, unknown>) {
    const division = String(dto.divisionPcode);
    const district = String(dto.districtPcode);
    const divRow = await this.db.adminAreas.findOne({
      where: { pcode: division, level: 'division' },
    });
    if (!divRow) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'Invalid division',
        ErrorCode.VALIDATION_ERROR,
      );
    }
    const dRow = await this.db.adminAreas.findOne({
      where: { pcode: district, level: 'district' },
    });
    if (!dRow || dRow.parentPcode !== division) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'Invalid district for division',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const upazila = dto.upazilaPcode as string | null | undefined;
    if (upazila) {
      const uRow = await this.db.adminAreas.findOne({
        where: { pcode: upazila, level: 'upazila' },
      });
      if (!uRow || uRow.parentPcode !== district) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'Invalid upazila for district',
          ErrorCode.VALIDATION_ERROR,
        );
      }
    }

    const union = dto.unionPcode as string | null | undefined;
    if (union) {
      if (!upazila) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'Union requires upazila',
          ErrorCode.VALIDATION_ERROR,
        );
      }
      const uniRow = await this.db.adminAreas.findOne({
        where: { pcode: union, level: 'union' },
      });
      if (!uniRow || uniRow.parentPcode !== upazila) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'Invalid union for upazila',
          ErrorCode.VALIDATION_ERROR,
        );
      }
    }
  }

  private async upsertMedia(
    incidentId: string,
    media?: Record<string, string | null>,
  ) {
    if (!media) return;
    const validated = this.mediaValidation.validate(media);
    for (const kind of ['image', 'youtube', 'facebook'] as const) {
      if (!(kind in validated)) continue;
      const url = validated[kind];
      if (url === null || url === undefined) {
        await this.db.incidentMedia.delete({ incidentId, kind });
        continue;
      }
      const existing = await this.db.incidentMedia.findOne({
        where: { incidentId, kind },
      });
      if (existing) {
        existing.url = url;
        await this.db.incidentMedia.save(existing);
      } else {
        await this.db.incidentMedia.save(
          this.db.incidentMedia.create({ incidentId, kind, url }),
        );
      }
    }
  }
}
