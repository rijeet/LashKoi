#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDiscover } from './discover.js';
import { runScrape } from './scrape.js';
import { runValidate } from './validate.js';
import { runExportAreas } from './export-areas.js';
import { runImport } from './import-api.js';
import { runTranslate } from './translate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** First positional path after the subcommand (skips flags like `--yes`). */
function positionalIn(): string | undefined {
  const fromFlag = arg('--in');
  if (fromFlag) return fromFlag;
  return process.argv
    .slice(3)
    .find((a) => !a.startsWith('--'));
}

const cmd = process.argv[2];

async function main() {
  switch (cmd) {
    case 'discover':
      await runDiscover(root, { days: Number(arg('--days') ?? 7) });
      break;
    case 'scrape':
      await runScrape(root);
      break;
    case 'run':
      await runDiscover(root, { days: Number(arg('--days') ?? 1) });
      await runScrape(root);
      break;
    case 'validate':
      runValidate(root, positionalIn());
      break;
    case 'export-areas':
      await runExportAreas(root);
      break;
    case 'translate':
      await runTranslate(root, positionalIn());
      break;
    case 'import':
      await runImport(root, {
        inFile: positionalIn(),
        target: arg('--target') ?? 'local',
        minRelevance: Number(arg('--min-relevance') ?? 0),
      });
      break;
    default:
      console.log(`Usage: harvest <discover|scrape|run|validate|export-areas|translate|import>
  --days N   discovery window
  --in path  input json/jsonl
  --target local|prod`);
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
