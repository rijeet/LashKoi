import { HttpStatus, Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

@Injectable()
export class BannerAdminService {
  constructor(private readonly db: AppDbContext) {}

  async list() {
    const rows = await this.db.featureBanners.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: { incident: true },
    });
    return rows.map((b) => this.toDto(b));
  }

  async create(dto: Record<string, unknown>) {
    const row = this.db.featureBanners.create({
      incidentId: (dto.incidentId as string) ?? null,
      imageUrl: String(dto.imageUrl),
      captionEn: (dto.captionEn as string) ?? null,
      captionBn: (dto.captionBn as string) ?? null,
      sectionType: String(dto.sectionType ?? 'breaking'),
      sortOrder: Number(dto.sortOrder ?? 0),
      isActive: dto.isActive !== false,
      startsAt: dto.startsAt ? new Date(String(dto.startsAt)) : null,
      endsAt: dto.endsAt ? new Date(String(dto.endsAt)) : null,
    });
    const saved = await this.db.featureBanners.save(row);
    return this.get(saved.id);
  }

  async patch(id: string, dto: Record<string, unknown>) {
    const row = await this.db.featureBanners.findOne({ where: { id } });
    if (!row) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    if (dto.incidentId !== undefined) {
      row.incidentId = (dto.incidentId as string) ?? null;
    }
    if (dto.imageUrl !== undefined) row.imageUrl = String(dto.imageUrl);
    if (dto.captionEn !== undefined) row.captionEn = (dto.captionEn as string) ?? null;
    if (dto.captionBn !== undefined) row.captionBn = (dto.captionBn as string) ?? null;
    if (dto.sectionType !== undefined) row.sectionType = String(dto.sectionType);
    if (dto.sortOrder !== undefined) row.sortOrder = Number(dto.sortOrder);
    if (dto.isActive !== undefined) row.isActive = Boolean(dto.isActive);
    if (dto.startsAt !== undefined) {
      row.startsAt = dto.startsAt ? new Date(String(dto.startsAt)) : null;
    }
    if (dto.endsAt !== undefined) {
      row.endsAt = dto.endsAt ? new Date(String(dto.endsAt)) : null;
    }
    await this.db.featureBanners.save(row);
    return this.get(id);
  }

  async remove(id: string) {
    const row = await this.db.featureBanners.findOne({ where: { id } });
    if (!row) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    await this.db.featureBanners.delete({ id });
    return { deleted: true };
  }

  async get(id: string) {
    const row = await this.db.featureBanners.findOne({
      where: { id },
      relations: { incident: true },
    });
    if (!row) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'Not found', ErrorCode.NOT_FOUND);
    }
    return this.toDto(row);
  }

  private toDto(b: {
    id: string;
    incidentId?: string | null;
    imageUrl: string;
    captionEn?: string | null;
    captionBn?: string | null;
    sectionType: string;
    sortOrder: number;
    isActive: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
    incident?: { slug: string; titleEn: string } | null;
  }) {
    return {
      id: b.id,
      incidentId: b.incidentId,
      imageUrl: b.imageUrl,
      captionEn: b.captionEn,
      captionBn: b.captionBn,
      sectionType: b.sectionType,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      startsAt: b.startsAt?.toISOString() ?? null,
      endsAt: b.endsAt?.toISOString() ?? null,
      incidentSlug: b.incident?.slug ?? null,
      incidentTitleEn: b.incident?.titleEn ?? null,
    };
  }
}
