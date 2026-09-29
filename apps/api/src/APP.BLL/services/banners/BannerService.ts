import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { localized, pickLang } from '@shared/utils/lang.util';
@Injectable()
export class BannerService {
  constructor(private readonly db: AppDbContext) {}

  async listFeatured(lang?: string, incidentId?: string) {
    const l = pickLang(lang);
    const now = new Date();
    const rows = await this.db.featureBanners.find({
      where: {
        isActive: true,
        ...(incidentId ? { incidentId } : {}),
      },
      relations: { incident: true },
      order: { sortOrder: 'ASC' },
    });
    return rows
      .filter((b) => {
        if (b.startsAt && b.startsAt > now) return false;
        if (b.endsAt && b.endsAt < now) return false;
        return true;
      })
      .map((b) => ({
        id: b.id,
        imageUrl: b.imageUrl,
        caption: localized(l, b.captionEn, b.captionBn),
        sectionType: b.sectionType,
        incident: b.incident
          ? {
              slug: b.incident.slug,
              headline: localized(l, b.incident.titleEn, b.incident.titleBn),
            }
          : null,
      }));
  }
}
