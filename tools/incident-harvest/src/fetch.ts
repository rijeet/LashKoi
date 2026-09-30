import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import robotsParser from 'robots-parser';
import { fetch } from 'undici';

const UA = 'LashKoiHarvester/1.0 (local editorial curation)';

const lastFetchByHost = new Map<string, number>();

export async function politeFetch(
  url: string,
  cacheDir: string,
): Promise<string> {
  const u = new URL(url);
  const robotsUrl = `${u.origin}/robots.txt`;
  let robotsTxt = '';
  try {
    const r = await fetch(robotsUrl, { headers: { 'User-Agent': UA } });
    robotsTxt = await r.text();
  } catch {
    robotsTxt = 'User-agent: *\nAllow: /';
  }
  const robots = robotsParser(robotsUrl, robotsTxt);
  if (!robots.isAllowed(url, UA)) {
    throw new Error(`robots.txt disallows ${url}`);
  }

  const hash = createHash('sha256').update(url).digest('hex');
  const cachePath = path.join(cacheDir, `${hash}.html`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }

  const host = u.hostname;
  const now = Date.now();
  const last = lastFetchByHost.get(host) ?? 0;
  const wait = 2500 - (now - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchByHost.set(host, Date.now());

  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, html, 'utf8');
  return html;
}
