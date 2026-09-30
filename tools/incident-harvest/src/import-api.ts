import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import * as readline from 'node:readline';

function loadEnv(root: string) {
  dotenvConfig({ path: path.join(root, '.env') });
}

async function login(base: string, email: string, password: string) {
  const res = await fetch(`${base}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json()) as {
    data?: { accessToken?: string };
    accessToken?: string;
  };
  const payload = json.data ?? json;
  const token =
    (payload as { accessToken?: string }).accessToken ??
    json.accessToken;
  if (!token) throw new Error('Login failed');
  return token;
}

function readFile(root: string, inFile?: string): string {
  const file =
    inFile ??
    path.join(
      root,
      'output',
      new Date().toISOString().slice(0, 10),
      'candidates.jsonl',
    );
  const raw = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.jsonl')) {
    const incidents = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    return JSON.stringify({ incidents });
  }
  return raw;
}

export async function runImport(
  root: string,
  opts: { inFile?: string; target: string; minRelevance: number },
) {
  loadEnv(root);
  const base =
    process.env.LASHKOI_API_BASE_URL ?? 'http://localhost:3000/api/v1';
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!password) throw new Error('Set ADMIN_PASSWORD in tools/incident-harvest/.env');

  const body = JSON.parse(readFile(root, opts.inFile));
  const token = await login(base, email, password);

  const dryRes = await fetch(`${base}/admin/incidents/bulk?dryRun=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      incidents: body.incidents ?? body,
      source: 'cli',
    }),
  });
  const dryJson = await dryRes.json();
  const data = dryJson.data ?? dryJson;
  console.log('Dry-run:', JSON.stringify(data.summary ?? data, null, 2));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const autoYes =
    process.argv.includes('--yes') || process.env.HARVEST_IMPORT_YES === '1';
  const answer = autoYes
    ? 'y'
    : await new Promise<string>((resolve) => {
        rl.question('Import as drafts? [y/N] ', resolve);
      });
  rl.close();
  if (answer.toLowerCase() !== 'y') return;

  const res = await fetch(`${base}/admin/incidents/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      incidents: body.incidents ?? body,
      source: 'cli',
    }),
  });
  const json = await res.json();
  console.log(JSON.stringify(json.data ?? json, null, 2));
}
