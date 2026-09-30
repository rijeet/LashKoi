import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, 'apps/api/.env.local') });

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const batches = await c.query(
  `SELECT id, created_count, row_count, error_count, created_at
   FROM import_batches ORDER BY created_at DESC LIMIT 5`,
);
const total = await c.query(
  `SELECT COUNT(*)::int AS n FROM incidents
   WHERE import_batch_id IS NOT NULL AND deleted_at IS NULL`,
);
const top = await c.query(
  `SELECT import_batch_id, COUNT(*)::int AS n FROM incidents
   WHERE import_batch_id IS NOT NULL AND deleted_at IS NULL
   GROUP BY import_batch_id ORDER BY n DESC LIMIT 3`,
);
console.log(JSON.stringify({ recentBatches: batches.rows, bulkDraftCount: total.rows[0].n, topBatches: top.rows }, null, 2));
await c.end();
