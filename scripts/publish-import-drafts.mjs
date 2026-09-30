/**
 * Dev helper: confirm map pin (PATCH same coords) + publish bulk-imported drafts.
 * Usage: node scripts/publish-import-drafts.mjs [importBatchId]
 */
import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, 'apps/api/.env.local') });

const base = process.env.LASHKOI_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const password = process.env.ADMIN_PASSWORD;
const importBatchId = process.argv[2];

if (!password) {
  console.error('Set ADMIN_PASSWORD in apps/api/.env.local');
  process.exit(1);
}

async function api(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
  const json = await res.json();
  const data = json.data ?? json;
  if (!res.ok) {
    const msg = data.message ?? data.error ?? JSON.stringify(data);
    throw new Error(`${res.status} ${path}: ${msg}`);
  }
  return data;
}

let token;

async function login() {
  const res = await fetch(`${base}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  const data = json.data ?? json;
  token = data.accessToken;
  if (!token) throw new Error('Login failed');
}

async function listDrafts() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const params = importBatchId ? [importBatchId] : [];
  const where = importBatchId
    ? 'import_batch_id = $1'
    : 'import_batch_id IS NOT NULL';
  const r = await client.query(
    `SELECT id, ref_code FROM incidents
     WHERE deleted_at IS NULL AND status = 'draft' AND ${where}
     ORDER BY ref_code`,
    params,
  );
  await client.end();
  return r.rows.map((row) => ({ id: row.id, refCode: row.ref_code }));
}

async function main() {
  await login();
  const drafts = await listDrafts();
  console.log(`Found ${drafts.length} import draft(s) to process`);
  const ok = [];
  const failed = [];

  for (const row of drafts) {
    try {
      const full = await api(`/admin/incidents/${row.id}`);
      const loc = full.location;
      if (!loc?.lat || !loc?.lng) {
        throw new Error('missing location');
      }
      if (!full.locationConfirmed) {
        await api(`/admin/incidents/${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            location: { lat: loc.lat, lng: loc.lng },
            divisionPcode: full.divisionPcode,
            districtPcode: full.districtPcode,
          }),
        });
      }
      await api(`/admin/incidents/${row.id}/publish`, { method: 'POST', body: '{}' });
      ok.push(row.refCode);
      process.stdout.write('.');
    } catch (e) {
      failed.push({ ref: row.refCode, id: row.id, error: e.message });
      process.stdout.write('x');
    }
  }
  console.log('\nPublished:', ok.length);
  if (failed.length) {
    console.log('Failed:', failed.length);
    console.log(JSON.stringify(failed.slice(0, 10), null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
