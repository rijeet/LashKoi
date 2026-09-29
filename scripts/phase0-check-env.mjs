/**
 * Phase 0 — verify local env files exist (values not validated).
 * Run from repo root: npm run phase0:check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  {
    label: 'API env',
    path: path.join(root, 'apps/api/.env.local'),
    example: path.join(root, 'apps/api/.env.example'),
  },
  {
    label: 'Web env',
    path: path.join(root, 'apps/web/.env'),
    example: path.join(root, 'apps/web/.env.example'),
  },
];

let ok = true;

for (const c of checks) {
  if (fs.existsSync(c.path)) {
    console.log(`✓ ${c.label}: ${path.relative(root, c.path)}`);
  } else {
    ok = false;
    console.warn(`✗ ${c.label}: missing ${path.relative(root, c.path)}`);
    console.warn(`  → copy ${path.relative(root, c.example)} and fill values`);
  }
}

const seed = path.join(root, 'config/incident-types.seed.json');
if (fs.existsSync(seed)) {
  console.log(`✓ Incident types seed: config/incident-types.seed.json`);
} else {
  ok = false;
  console.warn('✗ Missing config/incident-types.seed.json');
}

if (!ok) {
  console.warn('\nComplete docs/PHASE0_SIGNOFF.md before Phase 1.');
  process.exit(1);
}

console.log('\nPhase 0 file checklist passed. Confirm Neon PostGIS + Upstash in SETUP_NEON_UPSTASH.md.');
process.exit(0);
