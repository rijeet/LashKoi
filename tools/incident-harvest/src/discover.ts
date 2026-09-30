import * as fs from 'node:fs';
import * as path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { fetch } from 'undici';

const parser = new XMLParser({ ignoreAttributes: false });

function todayDir(root: string) {
  const d = new Date().toISOString().slice(0, 10);
  return path.join(root, 'output', d);
}

async function parseRss(url: string, since: Date) {
  const res = await fetch(url);
  const xml = await res.text();
  const doc = parser.parse(xml);
  const channel = doc.rss?.channel ?? doc.feed;
  const items = channel?.item ?? channel?.entry ?? [];
  const list = Array.isArray(items) ? items : [items];
  const out: Array<{ url: string; title: string; published?: string }> = [];
  for (const item of list) {
    const link =
      typeof item.link === 'string'
        ? item.link
        : item.link?.['@_href'] ?? item.link?.href;
    if (!link) continue;
    const linkStr = String(link);
    if (
      !linkStr.includes('prothomalo.com') &&
      !linkStr.includes('thedailystar.net')
    ) {
      continue;
    }
    const pub = item.pubDate ?? item.published ?? item['atom:updated'];
    const pd = pub ? new Date(pub) : new Date();
    if (pd < since) continue;
    out.push({
      url: String(link),
      title: String(item.title ?? ''),
      published: pub ? String(pub) : undefined,
    });
  }
  return out;
}

export async function runDiscover(
  root: string,
  opts: { days: number },
) {
  const since = new Date(Date.now() - opts.days * 86400000);
  const feeds = [
    'https://www.prothomalo.com/feed/',
    'https://www.thedailystar.net/rss.xml',
  ];
  const manual = path.join(root, 'input', 'urls.txt');
  const urls = new Map<string, { url: string; title: string; published?: string }>();
  for (const feed of feeds) {
    try {
      const items = await parseRss(feed, since);
      for (const it of items) urls.set(it.url, it);
    } catch (e) {
      console.warn('Feed failed', feed, e);
    }
  }
  if (fs.existsSync(manual)) {
    for (const line of fs.readFileSync(manual, 'utf8').split(/\r?\n/)) {
      const u = line.trim();
      if (u) urls.set(u, { url: u, title: u });
    }
  }
  const outDir = todayDir(root);
  fs.mkdirSync(outDir, { recursive: true });
  const list = [...urls.values()];
  fs.writeFileSync(
    path.join(outDir, 'discovered-urls.json'),
    JSON.stringify(list, null, 2),
  );
  console.log(`Discovered ${list.length} URLs → ${outDir}`);
}
