import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import pg from 'pg';

export async function runExportAreas(root: string) {
  const apiRoot = path.resolve(root, '../../apps/api');
  dotenvConfig({ path: path.join(apiRoot, '.env.local') });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing in apps/api/.env.local');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const res = await client.query(
    `SELECT pcode, parent_pcode, level, name_en, name_bn, division_pcode
     FROM admin_areas ORDER BY level, name_en`,
  );
  await client.end();
  const out = path.join(root, 'data', 'gazetteer.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify(
      res.rows.map((r) => ({
        pcode: r.pcode,
        parentPcode: r.parent_pcode,
        level: r.level,
        nameEn: r.name_en,
        nameBn: r.name_bn,
        divisionPcode: r.division_pcode,
      })),
      null,
      2,
    ),
  );
  console.log(`Exported ${res.rows.length} areas → ${out}`);
}
