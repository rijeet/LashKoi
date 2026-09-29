import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';
import AppDataSource from '@infra/db/typeorm/AppDataSource.datasource';
import { Incidents } from '@entity/entities/Incidents.entity';
import { IncidentTypes } from '@entity/entities/IncidentTypes.entity';
import { IncidentMedia } from '@entity/entities/IncidentMedia.entity';
import { IncidentStatus } from '@shared/enums/IncidentStatus.enum';
const root = path.resolve(__dirname, '../..');

function refCode(year: number, seq: number): string {
  return `LK-${year}-${String(seq).padStart(6, '0')}`;
}
dotenvConfig({ path: path.join(root, '.env.local') });
dotenvConfig({ path: path.join(root, '.env') });

type DemoRow = {
  slug: string;
  type: string;
  titleEn: string;
  titleBn?: string;
  summaryEn: string;
  summaryBn?: string;
  placeNameEn?: string;
  placeNameBn?: string;
  divisionPcode: string;
  districtPcode: string;
  lat: number;
  lng: number;
  caseCount?: number;
  sourceLabel?: string;
  sourceUrl?: string;
  bannerCaptionEn?: string;
  occurredAt: string;
  media?: { image?: string; youtube?: string; facebook?: string };
};

async function main() {
  const seedPath = path.resolve(root, '../../config/demo-incidents.seed.json');
  const { incidents } = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
    incidents: DemoRow[];
  };

  await AppDataSource.initialize();
  const incidentRepo = AppDataSource.getRepository(Incidents);
  const typeRepo = AppDataSource.getRepository(IncidentTypes);
  const mediaRepo = AppDataSource.getRepository(IncidentMedia);
  const publishedCount = await incidentRepo.count({
    where: { status: IncidentStatus.PUBLISHED },
  });
  if (publishedCount >= incidents.length) {
    console.log(`Demo skip: ${publishedCount} published incident(s) already in DB.`);
    await AppDataSource.destroy();
    return;
  }

  const year = new Date().getFullYear();
  let seq = await incidentRepo.count();

  for (const row of incidents) {
    const exists = await incidentRepo.findOne({ where: { slug: row.slug } });
    if (exists) {
      if (exists.status !== IncidentStatus.PUBLISHED) {
        exists.status = IncidentStatus.PUBLISHED;
        exists.publishedAt = exists.publishedAt ?? new Date();
        await incidentRepo.save(exists);
        console.log('Published existing:', row.slug);
      }
      continue;
    }

    const type = await typeRepo.findOne({ where: { code: row.type } });
    if (!type) {
      console.warn('Skip (unknown type):', row.slug, row.type);
      continue;
    }

    seq += 1;
    const saved = await incidentRepo.save(
      incidentRepo.create({
        refCode: refCode(year, seq),
        slug: row.slug,
        typeId: type.id,
        titleEn: row.titleEn,
        titleBn: row.titleBn ?? null,
        summaryEn: row.summaryEn,
        summaryBn: row.summaryBn ?? null,
        bodyHtml: `<p>${row.summaryEn}</p>`,
        placeNameEn: row.placeNameEn ?? null,
        placeNameBn: row.placeNameBn ?? null,
        location: {
          type: 'Point',
          coordinates: [row.lng, row.lat],
        } as unknown as string,
        divisionPcode: row.divisionPcode,
        districtPcode: row.districtPcode,
        sourceLabel: row.sourceLabel ?? 'Demo',
        sourceUrl: row.sourceUrl ?? null,
        bannerCaptionEn: row.bannerCaptionEn ?? null,
        caseCount: row.caseCount ?? null,
        status: IncidentStatus.PUBLISHED,
        occurredAt: new Date(row.occurredAt),
        publishedAt: new Date(),
      }),
    );

    if (row.media) {
      for (const kind of ['image', 'youtube', 'facebook'] as const) {
        const url = row.media[kind];
        if (!url) continue;
        await mediaRepo.save(
          mediaRepo.create({ incidentId: saved.id, kind, url }),
        );
      }
    }

    console.log('Created demo incident:', row.slug);
  }

  await AppDataSource.destroy();
  console.log('Demo incidents seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
