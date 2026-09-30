import * as fs from 'node:fs';
import * as path from 'node:path';

type GazetteerEntry = {
  pcode: string;
  level: string;
  nameEn: string;
  nameBn?: string | null;
  parentPcode?: string | null;
  divisionPcode?: string | null;
};

const BN_SUFFIXES = ['ে', 'য়', 'তে', 'র', 'এ'];

function normBn(s: string): string {
  let t = s.normalize('NFC').trim();
  for (const suf of BN_SUFFIXES) {
    if (t.endsWith(suf) && t.length > suf.length + 2) {
      t = t.slice(0, -suf.length);
    }
  }
  return t;
}

const VARIANTS: Record<string, string> = {
  chittagong: 'chattogram',
  comilla: 'cumilla',
  bogra: 'bogura',
  barisal: 'barishal',
  jessore: 'jashore',
};

export function loadGazetteer(root: string): GazetteerEntry[] {
  const p = path.join(root, 'data', 'gazetteer.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8')) as GazetteerEntry[];
}

export function resolvePlace(
  text: string,
  gazetteer: GazetteerEntry[],
): {
  placeNameEn?: string;
  placeNameBn?: string;
  divisionPcode?: string;
  districtPcode?: string;
  geo: number;
} {
  const lower = text.toLowerCase();
  const districts = gazetteer.filter((g) => g.level === 'district');
  for (const d of districts) {
    const en = VARIANTS[d.nameEn.toLowerCase()] ?? d.nameEn.toLowerCase();
    const bn = d.nameBn ? normBn(d.nameBn) : '';
    if (
      lower.includes(en) ||
      (bn && text.includes(bn)) ||
      lower.includes(d.nameEn.toLowerCase())
    ) {
      const div =
        d.parentPcode ??
        d.divisionPcode ??
        districts.find((x) => x.pcode === d.parentPcode)?.pcode;
      return {
        placeNameEn: d.nameEn,
        placeNameBn: d.nameBn ?? undefined,
        divisionPcode: div ?? undefined,
        districtPcode: d.pcode,
        geo: lower.includes(en) || (bn && text.includes(bn)) ? 1 : 0.6,
      };
    }
  }
  return { geo: 0 };
}
