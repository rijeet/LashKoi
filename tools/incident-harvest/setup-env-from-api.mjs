import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const apiEnv = path.join(root, '../../apps/api/.env.local');
const harvestEnv = path.join(root, '.env');

function pick(lines, key) {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return '';
  return line.slice(key.length + 1).trim();
}

if (!fs.existsSync(apiEnv)) {
  console.error('Missing apps/api/.env.local');
  process.exit(1);
}
const lines = fs.readFileSync(apiEnv, 'utf8').split(/\r?\n/);
const password = pick(lines, 'ADMIN_PASSWORD');
if (!password) {
  console.error('ADMIN_PASSWORD not set in apps/api/.env.local');
  process.exit(1);
}
const content = `LASHKOI_API_BASE_URL=http://localhost:3000/api/v1
ADMIN_EMAIL=${pick(lines, 'ADMIN_EMAIL') || 'admin@example.com'}
ADMIN_PASSWORD=${password}
OLLAMA_MODEL=llama3.1:8b
`;
fs.writeFileSync(harvestEnv, content);
console.log('Wrote tools/incident-harvest/.env (OLLAMA_MODEL=llama3.1:8b)');
