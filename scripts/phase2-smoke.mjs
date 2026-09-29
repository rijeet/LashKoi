/**
 * Phase 2 smoke — public API endpoints (API must be running on :3000).
 * Usage: npm run phase2:smoke
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readApiBase() {
  const envPath = path.join(root, 'apps/web/.env');
  if (!fs.existsSync(envPath)) {
    return 'http://localhost:3000/api/v1';
  }
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('VITE_API_BASE_URL='));
  const raw = line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  return (raw || 'http://localhost:3000/api/v1').replace(/\/$/, '');
}

const base = readApiBase();
const origin = base.replace(/\/api\/v1\/?$/, '');

async function get(path, label, { root = false } = {}) {
  const url = `${root ? origin : base}${path}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (root) {
      if (!res.ok || !json.ok) {
        console.error(`✗ ${label}: HTTP ${res.status}`);
        return false;
      }
      console.log(`✓ ${label} (db=${json.db}, redis=${json.redis})`);
      return json;
    }
    if (!res.ok || json.status !== 'success') {
      console.error(`✗ ${label}: HTTP ${res.status} — ${json.message ?? 'error'}`);
      return false;
    }
    console.log(`✓ ${label}`);
    return json.data;
  } catch (err) {
    console.error(`✗ ${label}: ${err.message}`);
    console.error(`  Is the API running? npm run api:dev → ${base}`);
    return false;
  }
}

let ok = true;

const health = await get('/health', 'GET /health', { root: true });
if (!health) ok = false;

const types = await get('/incident-types?lang=en', 'GET /incident-types');
if (!types?.length) {
  console.warn('  → Run npm run api:seed');
  ok = false;
}

const divisions = await get('/boundaries/divisions?lang=en', 'GET /boundaries/divisions');
if (!divisions?.length) {
  console.warn('  → Run npm run api:seed:areas (needs election GeoJSON path)');
  ok = false;
}

const incidents = await get('/incidents?lang=en', 'GET /incidents (GeoJSON)');
const featureCount = incidents?.features?.length ?? 0;
if (featureCount === 0) {
  console.warn('  → Run npm run api:seed:demo for map markers');
  ok = false;
} else {
  console.log(`  → ${featureCount} published feature(s) on map`);
}

const days = await get('/incidents/days?lang=en', 'GET /incidents/days');
if (!days?.length) {
  console.warn('  → Days list empty (needs published incidents)');
}

if (!ok) {
  console.warn('\nPhase 2 smoke: fix items above, then re-run.');
  process.exit(1);
}

console.log('\nPhase 2 smoke passed. Open http://localhost:5173 (npm run web:dev).');
process.exit(0);
