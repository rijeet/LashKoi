import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

export type KeywordConfig = Record<
  string,
  { include: string[]; exclude?: string[]; aggregate?: string[] }
>;

export function loadKeywords(root: string): KeywordConfig {
  const base = path.join(root, 'config', 'keywords.yaml');
  const local = path.join(root, 'input', 'keywords.local.yaml');
  const cfg = yaml.parse(fs.readFileSync(base, 'utf8')) as {
    types: KeywordConfig;
  };
  let types = cfg.types;
  if (fs.existsSync(local)) {
    const over = yaml.parse(fs.readFileSync(local, 'utf8')) as {
      types?: KeywordConfig;
    };
    types = { ...types, ...over.types };
  }
  return types;
}

export function classifyText(
  text: string,
  keywords: KeywordConfig,
): {
  type: string | null;
  scope: 'event' | 'aggregate' | 'statement';
  matched: string[];
  relevance: number;
} {
  const lower = text.toLowerCase();
  let best: {
    type: string;
    score: number;
    matched: string[];
    scope: 'event' | 'aggregate' | 'statement';
  } | null = null;

  for (const [type, rule] of Object.entries(keywords)) {
    for (const ex of rule.exclude ?? []) {
      if (lower.includes(ex.toLowerCase())) {
        return {
          type: null,
          scope: 'statement',
          matched: [ex],
          relevance: 0,
        };
      }
    }
    let scope: 'event' | 'aggregate' | 'statement' = 'event';
    for (const ag of rule.aggregate ?? []) {
      if (lower.includes(ag.toLowerCase())) scope = 'aggregate';
    }
    for (const inc of rule.include) {
      if (lower.includes(inc.toLowerCase())) {
        const score = 0.7 + (text.slice(0, 120).includes(inc) ? 0.2 : 0);
        if (!best || score > best.score) {
          best = { type, score, matched: [inc], scope };
        }
      }
    }
  }

  if (!best) {
    return { type: null, scope: 'statement', matched: [], relevance: 0 };
  }
  return {
    type: best.type,
    scope: best.scope,
    matched: best.matched,
    relevance: best.score,
  };
}
