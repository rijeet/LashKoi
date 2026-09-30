import * as fs from 'node:fs';
import * as path from 'node:path';
import { candidateRowSchema } from './schema.js';

function loadRows(file: string): unknown[] {
  const raw = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.jsonl')) {
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    for (const key of ['incidents', 'items', 'data']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  throw new Error('Expected JSON array, { incidents: [] }, or JSONL');
}

export function runValidate(root: string, inFile?: string) {
  const file =
    inFile ??
    path.join(
      root,
      'output',
      new Date().toISOString().slice(0, 10),
      'candidates.jsonl',
    );
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  const rows = loadRows(file);
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const normalized =
      row &&
      typeof row === 'object' &&
      !(row as Record<string, unknown>).schemaVersion
        ? { schemaVersion: 1, ...(row as Record<string, unknown>) }
        : row;
    const r = candidateRowSchema.safeParse(normalized);
    if (r.success) ok++;
    else {
      fail++;
      console.warn(r.error.message);
    }
  }
  console.log(`Validate: ${ok} ok, ${fail} failed (${file})`);
  if (fail) process.exit(1);
}
