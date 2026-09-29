import type { Lang } from '@/types/api';

/** Election / GeoJSON spellings → preferred English labels (from map-viewer). */
const DISTRICT_EN_ALIASES: Record<string, string> = {
  Netrakona: 'Netrokona',
  Khagrachhari: 'Khagrachari',
  Sirajganj: 'Sirajgonj',
  Moulvibazar: 'Maulvibazar',
  Chapainababganj: 'Nawabganj',
};

const DISTRICT_BN_OVERRIDE: Record<string, string> = {
  Chapainababganj: 'চাঁপাইনবাবগঞ্জ',
};

const DIVISION_BN_BY_PCODE: Record<string, string> = {
  BD10: 'বরিশাল',
  BD20: 'চট্টগ্রাম',
  BD30: 'ঢাকা',
  BD40: 'খুলনা',
  BD45: 'ময়মনসিংহ',
  BD50: 'রাজশাহী',
  BD55: 'রংপুর',
  BD60: 'সিলেট',
};

export type AreaLabelProps = {
  nameEn?: string | null;
  nameBn?: string | null;
  pcode?: string | null;
  level?: 'division' | 'district' | 'upazila' | 'union';
};

export function resolveAreaLabel(lang: Lang, props: AreaLabelProps): string {
  const en = (props.nameEn ?? '').trim();
  if (!en) return props.pcode ?? '';

  if (lang === 'en') {
    if (props.level === 'district' && DISTRICT_EN_ALIASES[en]) {
      return DISTRICT_EN_ALIASES[en];
    }
    return en;
  }

  if (props.level === 'district' && DISTRICT_BN_OVERRIDE[en]) {
    return DISTRICT_BN_OVERRIDE[en];
  }
  if (props.nameBn?.trim()) return props.nameBn.trim();
  if (props.level === 'division' && props.pcode && DIVISION_BN_BY_PCODE[props.pcode]) {
    return DIVISION_BN_BY_PCODE[props.pcode];
  }
  return en;
}

export function divisionFontPx(zoom: number): number {
  return Math.max(10, Math.round(8 + (zoom - 6) * 3.5));
}

export function districtFontPx(zoom: number): number {
  return Math.max(8, Math.round(6 + (zoom - 6) * 3.2));
}

export function upazilaFontPx(zoom: number): number {
  return Math.max(7, Math.round(5 + (zoom - 8) * 2.8));
}

export function unionFontPx(zoom: number): number {
  return Math.max(6, Math.round(4 + (zoom - 10) * 2));
}
