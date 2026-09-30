import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IncidentAdminService } from '../IncidentAdminService';
import { IncidentImportNormalizerService } from './IncidentImportNormalizerService';
import { DRAFT_PLACEHOLDER_GEO } from './incident-import.constants';
import { ImportBatches } from '@entity/entities/ImportBatches.entity';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';
import type { ICurrentUser } from '@shared/interfaces/domain/ICurrentUser.interface';

const MAX_ROWS = 200;

@Injectable()
export class IncidentBulkImportService {
  constructor(
    private readonly db: AppDbContext,
    private readonly config: ConfigService,
    private readonly normalizer: IncidentImportNormalizerService,
    private readonly incidents: IncidentAdminService,
  ) {}

  private batchRepo() {
    return this.db.incidents.manager.getRepository(ImportBatches);
  }

  assertEnabled(): void {
    const flag = this.config.get<string>('ADMIN_BULK_IMPORT_ENABLED', '');
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const enabled =
      flag === 'true' ||
      flag === '1' ||
      (nodeEnv !== 'production' && flag !== 'false');
    if (!enabled) {
      throw new ApiHttpException(
        HttpStatus.NOT_FOUND,
        'Bulk import disabled',
        ErrorCode.NOT_FOUND,
      );
    }
  }

  normalizePayload(input: {
    raw?: string;
    format?: 'json' | 'jsonl';
    incidents?: Record<string, unknown>[];
    profile?: string;
  }) {
    this.assertEnabled();
    let items: Record<string, unknown>[];
    if (input.incidents?.length) {
      items = input.incidents;
    } else if (input.raw) {
      items = this.normalizer.parseContainer(
        input.raw,
        input.format ?? 'json',
      );
    } else {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'Provide raw or incidents',
        ErrorCode.VALIDATION_ERROR,
      );
    }
    if (items.length > MAX_ROWS) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        `Maximum ${MAX_ROWS} rows per batch`,
        ErrorCode.VALIDATION_ERROR,
      );
    }
    return this.normalizer.normalizeItems(items, input.profile);
  }

  async importBatch(
    input: {
      raw?: string;
      format?: 'json' | 'jsonl';
      incidents?: Record<string, unknown>[];
      profile?: string;
      fileName?: string;
      source?: 'cli' | 'ui';
      indices?: number[];
    },
    user: ICurrentUser,
    opts: { dryRun: boolean; idempotencyKey?: string },
  ) {
    this.assertEnabled();

    if (opts.idempotencyKey) {
      const existing = await this.batchRepo().findOne({
        where: { idempotencyKey: opts.idempotencyKey },
      });
      if (existing?.meta) {
        return existing.meta as Record<string, unknown>;
      }
    }

    const normalized = this.normalizePayload(input);
    const selected = new Set(
      input.indices ?? normalized.rows.map((r) => r.index),
    );

    const created: Array<{ index: number; id: string; externalId: string }> =
      [];
    const skipped: Array<{ index: number; externalId: string; reason: string }> =
      [];
    const errors: Array<{
      index: number;
      externalId?: string;
      code: string;
      message: string;
    }> = [];

    let batchId: string | null = null;
    if (!opts.dryRun) {
      const batch = await this.batchRepo().save(
        this.batchRepo().create({
          createdById: user.userId,
          source: input.source ?? 'ui',
          fileName: input.fileName ?? null,
          idempotencyKey: opts.idempotencyKey ?? null,
          rowCount: 0,
          dryRun: false,
        }),
      );
      batchId = batch.id;
    }

    for (const row of normalized.rows) {
      if (!selected.has(row.index)) continue;
      if (!row.ok || !row.row) {
        errors.push({
          index: row.index,
          code: 'VALIDATION',
          message: row.errors.join('; ') || 'Invalid row',
        });
        continue;
      }
      const externalId = String(row.row.externalId ?? '');
      const dup = await this.db.incidents.findOne({
        where: { externalId },
      });
      if (dup) {
        skipped.push({ index: row.index, externalId, reason: 'duplicate' });
        continue;
      }
      if (opts.dryRun) {
        created.push({ index: row.index, id: 'dry-run', externalId });
        continue;
      }
      try {
        const resolved = await this.resolveGeo(row.row);
        const id = await this.incidents.createDraftFromImport(
          resolved,
          user,
          externalId,
          batchId,
        );
        created.push({ index: row.index, id, externalId });
      } catch (e) {
        errors.push({
          index: row.index,
          externalId,
          code: 'IMPORT',
          message: e instanceof Error ? e.message : 'Import failed',
        });
      }
    }

    const result = {
      batchId,
      dryRun: opts.dryRun,
      detectedProfile: normalized.detectedProfile,
      summary: normalized.summary,
      created,
      skipped,
      errors,
    };

    if (!opts.dryRun && batchId) {
      await this.db.incidents.query(
        `UPDATE import_batches SET row_count = $1, created_count = $2, skipped_count = $3, error_count = $4, meta = $5::jsonb WHERE id = $6`,
        [
          created.length + skipped.length + errors.length,
          created.length,
          skipped.length,
          errors.length,
          JSON.stringify(result),
          batchId,
        ],
      );
    }

    return result;
  }

  private async resolveGeo(row: Record<string, unknown>) {
    const divisionPcode = row.divisionPcode as string | undefined;
    const districtPcode = row.districtPcode as string | undefined;
    let lat = row.lat as number | undefined;
    let lng = row.lng as number | undefined;
    let locationConfirmed = false;

    if (divisionPcode && districtPcode && lat != null && lng != null) {
      locationConfirmed = true;
    } else {
      const place = [row.placeNameEn, row.placeNameBn, row.placeHint]
        .filter(Boolean)
        .join(' ');
      const match = await this.matchDistrict(String(place));
      if (match) {
        row.divisionPcode = match.divisionPcode;
        row.districtPcode = match.districtPcode;
        lat = match.lat;
        lng = match.lng;
      } else {
        row.divisionPcode = DRAFT_PLACEHOLDER_GEO.divisionPcode;
        row.districtPcode = DRAFT_PLACEHOLDER_GEO.districtPcode;
        lat = DRAFT_PLACEHOLDER_GEO.lat;
        lng = DRAFT_PLACEHOLDER_GEO.lng;
      }
    }

    return {
      ...row,
      location: {
        lat: lat ?? DRAFT_PLACEHOLDER_GEO.lat,
        lng: lng ?? DRAFT_PLACEHOLDER_GEO.lng,
      },
      divisionPcode: String(row.divisionPcode),
      districtPcode: String(row.districtPcode),
      locationConfirmed,
    };
  }

  private async matchDistrict(text: string) {
    if (!text.trim()) return null;
    const norm = text.toLowerCase();
    const areas = await this.db.adminAreas.find({
      where: { level: 'district' },
      take: 500,
    });
    for (const a of areas) {
      const en = a.nameEn.toLowerCase();
      const bn = a.nameBn?.toLowerCase() ?? '';
      if (norm.includes(en) || (bn && norm.includes(bn))) {
        const divPcode = a.parentPcode ?? a.divisionPcode;
        const [loc] = await this.db.adminAreas.query(
          `SELECT ST_Y(centroid::geometry) as lat, ST_X(centroid::geometry) as lng
           FROM admin_areas WHERE pcode = $1 AND centroid IS NOT NULL`,
          [a.pcode],
        );
        return {
          divisionPcode: divPcode ?? DRAFT_PLACEHOLDER_GEO.divisionPcode,
          districtPcode: a.pcode,
          lat: loc?.lat != null ? Number(loc.lat) : DRAFT_PLACEHOLDER_GEO.lat,
          lng: loc?.lng != null ? Number(loc.lng) : DRAFT_PLACEHOLDER_GEO.lng,
        };
      }
    }
    return null;
  }
}
