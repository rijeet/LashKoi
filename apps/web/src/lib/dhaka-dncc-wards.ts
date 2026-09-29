import type { Lang } from '@/types/api';

export type DnccWard = {
  wardNo: number;
  labelEn: string;
  labelBn: string;
  areasEn: string[];
  areasBn: string[];
};

export type DnccWardIndex = {
  wards: DnccWard[];
};

function normKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, '');
}

function scoreUnionToArea(unionKey: string, area: string): number {
  const areaKey = normKey(area);
  if (!unionKey || !areaKey) return 0;
  if (unionKey === areaKey) return 100;
  if (areaKey.startsWith(unionKey) || unionKey.startsWith(areaKey)) {
    const len = Math.min(unionKey.length, areaKey.length);
    if (len >= 4) return 85;
    if (len >= 3) return 70;
  }
  if (areaKey.includes(unionKey) && unionKey.length >= 4) return 75;
  if (unionKey.includes(areaKey) && areaKey.length >= 4) return 65;
  const uWords = unionKey.match(/[a-z]{3,}/g) ?? [];
  for (const w of uWords) {
    if (areaKey.includes(w)) return 55;
  }
  return 0;
}

export function matchDnccWardForUnion(
  unionNameEn: string | undefined,
  unionNameBn: string | undefined,
  index: DnccWardIndex,
): DnccWard | null {
  const keys = [normKey(unionNameEn ?? ''), normKey(unionNameBn ?? '')].filter(
    (k) => k.length >= 2,
  );
  if (!keys.length) return null;

  type Hit = { ward: DnccWard; score: number; areaIndex: number };
  let best: Hit | null = null;

  for (const ward of index.wards) {
    for (let areaIndex = 0; areaIndex < ward.areasEn.length; areaIndex++) {
      const area = ward.areasEn[areaIndex];
      for (const key of keys) {
        const score = scoreUnionToArea(key, area);
        if (score > 0 && (!best || score > best.score)) {
          best = { ward, score, areaIndex };
        }
      }
    }
  }

  const hit = best;
  if (!hit || hit.score < 55) return null;

  return hit.ward;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildDhakaUnionTooltipHtml(
  lang: Lang,
  unionLabel: string,
  index: DnccWardIndex | null,
  unionNameEn?: string,
  unionNameBn?: string,
): string {
  const lines: string[] = [
    `<div class="lk-map-tooltip__title">${escapeHtml(unionLabel)}</div>`,
  ];

  if (!index) return lines.join('');

  const ward = matchDnccWardForUnion(unionNameEn, unionNameBn, index);
  if (!ward) return lines.join('');

  const wardLabel = lang === 'bn' ? ward.labelBn : ward.labelEn;
  lines.push(
    `<div class="lk-map-tooltip__ward">${escapeHtml(wardLabel)}</div>`,
  );

  return lines.join('');
}
