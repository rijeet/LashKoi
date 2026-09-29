import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';
import AppDataSource from '@infra/db/typeorm/AppDataSource.datasource';
import { AdminAreas } from '@entity/entities/AdminAreas.entity';

const root = path.resolve(__dirname, '../..');
dotenvConfig({ path: path.join(root, '.env.local') });

const defaultGeojson =
  process.env.ADMIN_POINTS_GEOJSON ??
  'E:\\election_file_2026\\bgd_admin_boundaries.geojson\\bgd_adminpoints.geojson';

const bnDivisions = JSON.parse(
  fs.readFileSync(
    path.resolve(root, '../../bangladesh-geojson/dist/data/bd-divisions.json'),
    'utf8',
  ),
) as { divisions: Array<{ id: string; name: string; bn_name: string }> };

const bnDistricts = JSON.parse(
  fs.readFileSync(
    path.resolve(root, '../../bangladesh-geojson/dist/data/bd-districts.json'),
    'utf8',
  ),
) as {
  districts: Array<{ id: string; division_id: string; name: string; bn_name: string }>;
};

function bnDivision(name: string): string | null {
  const row = bnDivisions.divisions.find(
    (d) => d.name.toLowerCase() === name.toLowerCase(),
  );
  return row?.bn_name ?? null;
}

function bnDistrict(name: string): string | null {
  const row = bnDistricts.districts.find(
    (d) => d.name.toLowerCase() === name.toLowerCase(),
  );
  return row?.bn_name ?? null;
}

async function main() {
  if (!fs.existsSync(defaultGeojson)) {
    throw new Error(`GeoJSON not found: ${defaultGeojson}`);
  }
  const geo = JSON.parse(fs.readFileSync(defaultGeojson, 'utf8')) as {
    features: Array<{ properties: Record<string, unknown>; geometry: { coordinates: number[] } }>;
  };

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(AdminAreas);

  const levelMap: Record<number, string> = {
    1: 'division',
    2: 'district',
    3: 'upazila',
    4: 'union',
  };

  let inserted = 0;
  for (const f of geo.features) {
    const levelNum = Number(f.properties.admin_level);
    const level = levelMap[levelNum];
    if (!level) continue;

    let pcode: string | null = null;
    let parent: string | null = null;
    let nameEn = String(f.properties.name ?? '');
    let divisionPcode: string | null = null;
    let districtPcode: string | null = null;

    if (level === 'division') {
      pcode = String(f.properties.adm1_pcode ?? '');
      parent = 'BD';
      divisionPcode = pcode;
    } else if (level === 'district') {
      pcode = String(f.properties.adm2_pcode ?? '');
      parent = String(f.properties.adm1_pcode ?? '');
      divisionPcode = parent;
      districtPcode = pcode;
    } else if (level === 'upazila') {
      pcode = String(f.properties.adm3_pcode ?? '');
      parent = String(f.properties.adm2_pcode ?? '');
      divisionPcode = String(f.properties.adm1_pcode ?? '');
      districtPcode = parent;
    } else if (level === 'union') {
      pcode = String(f.properties.adm4_pcode ?? '');
      parent = String(f.properties.adm3_pcode ?? '');
      divisionPcode = String(f.properties.adm1_pcode ?? '');
      districtPcode = String(f.properties.adm2_pcode ?? '');
    }

    if (!pcode || pcode === 'null') continue;

    const nameBn =
      level === 'division'
        ? bnDivision(nameEn)
        : level === 'district'
          ? bnDistrict(nameEn)
          : null;

    const [lng, lat] = f.geometry.coordinates;
    const exists = await repo.exist({ where: { pcode } });
    if (exists) continue;

    await AppDataSource.query(
      `INSERT INTO admin_areas (pcode, parent_pcode, level, name_en, name_bn, division_pcode, district_pcode, centroid)
       VALUES ($1,$2,$3,$4,$5,$6,$7, ST_SetSRID(ST_MakePoint($8,$9),4326)::geography)`,
      [
        pcode,
        parent,
        level,
        nameEn,
        nameBn ?? nameEn,
        divisionPcode,
        districtPcode,
        lng,
        lat,
      ],
    );
    inserted++;
  }

  await AppDataSource.destroy();
  console.log(`Admin areas inserted: ${inserted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
