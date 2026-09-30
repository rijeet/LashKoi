import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { politeFetch } from './fetch.js';
import { extractArticle } from './extract.js';
import { classifyText, loadKeywords } from './classify.js';
import { loadGazetteer, resolvePlace } from './geo.js';
import type { CandidateRow } from './schema.js';

function todayDir(root: string) {
  const d = new Date().toISOString().slice(0, 10);
  return path.join(root, 'output', d);
}

function hostLabel(url: string): string {
  if (url.includes('prothomalo.com')) return 'Prothom Alo';
  if (url.includes('thedailystar.net')) return 'The Daily Star';
  return 'News';
}

function externalId(url: string): string {
  const h = createHash('sha256').update(url).digest('hex');
  return `sha256:${h}`;
}

export async function runScrape(root: string) {
  const outDir = todayDir(root);
  const discoveredPath = path.join(outDir, 'discovered-urls.json');
  if (!fs.existsSync(discoveredPath)) {
    throw new Error('Run discover first');
  }
  const discovered = JSON.parse(
    fs.readFileSync(discoveredPath, 'utf8'),
  ) as Array<{ url: string; title: string; published?: string }>;
  const keywords = loadKeywords(root);
  const gazetteer = loadGazetteer(root);
  const cacheDir = path.join(root, '.cache', 'html');
  const rows: CandidateRow[] = [];
  const seen = new Set<string>();

  for (const item of discovered) {
    try {
      const html = await politeFetch(item.url, cacheDir);
      const extracted = extractArticle(html);
      const combined = `${extracted.title} ${extracted.description}`;
      const cls = classifyText(combined, keywords);
      if (!cls.type || cls.scope !== 'event' || cls.relevance < 0.6) continue;

      const geo = resolvePlace(combined, gazetteer);
      const id = externalId(item.url);
      if (seen.has(id)) continue;
      seen.add(id);

      const isBn = /[\u0980-\u09FF]/.test(extracted.title);
      const needsReview = ['translation', 'mapPin'];
      const row: CandidateRow = {
        schemaVersion: 1,
        externalId: id,
        type: cls.type,
        titleBn: isBn ? extracted.title : null,
        titleEn: isBn ? null : extracted.title,
        summaryBn: isBn ? extracted.description : null,
        summaryEn: isBn ? null : extracted.description,
        placeNameEn: geo.placeNameEn ?? null,
        placeNameBn: geo.placeNameBn ?? null,
        placeHint: extracted.title.slice(0, 200),
        caseCount: null,
        sourceLabel: hostLabel(item.url),
        sourceUrl: item.url,
        ...(extracted.image
          ? { media: { image: extracted.image } }
          : {}),
        occurredAt: extracted.publishedAt
          ? new Date(extracted.publishedAt).toISOString()
          : new Date().toISOString(),
        _harvest: {
          source: item.url.includes('prothomalo') ? 'prothomalo' : 'thedailystar',
          fetchedAt: new Date().toISOString(),
          extractor: extracted.extractor,
          matchedKeywords: cls.matched,
          scope: cls.scope,
          scores: { relevance: cls.relevance, geo: geo.geo },
          guessed: {
            divisionPcode: geo.divisionPcode,
            districtPcode: geo.districtPcode,
          },
          needsReview,
        },
      };
      rows.push(row);
    } catch (e) {
      console.warn('Skip', item.url, e);
    }
  }

  const jsonl = rows.map((r) => JSON.stringify(r)).join('\n');
  fs.writeFileSync(path.join(outDir, 'candidates.jsonl'), jsonl);
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        runAt: new Date().toISOString(),
        counts: { discovered: discovered.length, candidates: rows.length },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${rows.length} candidates → ${outDir}/candidates.jsonl`);
}
