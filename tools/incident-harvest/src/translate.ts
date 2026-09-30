import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as dotenvConfig } from 'dotenv';

export async function runTranslate(root: string, inFile?: string) {
  dotenvConfig({ path: path.join(root, '.env') });
  const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
  const file =
    inFile ??
    path.join(
      root,
      'output',
      new Date().toISOString().slice(0, 10),
      'candidates.jsonl',
    );
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const out: string[] = [];

  for (const line of lines) {
    const row = JSON.parse(line) as Record<string, unknown>;
    const harvest = row._harvest as Record<string, unknown> | undefined;
    const needs = (harvest?.needsReview as string[]) ?? [];
    try {
      if (!row.titleEn && row.titleBn) {
        const en = await ollamaTranslate(String(row.titleBn), 'en', model);
        row.titleEn = en;
        if (!needs.includes('translation')) needs.push('translation');
      }
      if (!row.summaryEn && row.summaryBn) {
        row.summaryEn = await ollamaTranslate(String(row.summaryBn), 'en', model);
      }
      if (harvest) harvest.translation = { engine: 'ollama', model, at: new Date().toISOString() };
    } catch {
      if (!row.titleEn && row.titleBn) row.titleEn = row.titleBn;
      if (!row.summaryEn && row.summaryBn) row.summaryEn = row.summaryBn;
      if (!needs.includes('translation')) needs.push('translation');
    }
    if (harvest) harvest.needsReview = needs;
    out.push(JSON.stringify(row));
  }
  fs.writeFileSync(file, out.join('\n'));
  console.log('Translation pass complete');
}

async function ollamaTranslate(text: string, target: string, model: string) {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      messages: [
        {
          role: 'user',
          content: `Translate to ${target}. Return JSON {"text":"..."} only. Do not add facts.\n${text}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error('Ollama unavailable');
  const json = (await res.json()) as { message?: { content?: string } };
  const parsed = JSON.parse(json.message?.content ?? '{}') as { text?: string };
  if (!parsed.text) throw new Error('bad ollama json');
  return parsed.text.slice(0, 500);
}
