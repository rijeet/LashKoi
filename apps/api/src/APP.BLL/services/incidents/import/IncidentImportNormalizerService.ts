import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  BD_BBOX,
  INCIDENT_TYPE_CODES,
  TYPE_SYNONYMS,
} from './incident-import.constants';

export type NormalizeRowResult = {
  index: number;
  ok: boolean;
  row?: Record<string, unknown>;
  mapped: Record<string, string>;
  warnings: string[];
  errors: string[];
  unmappedKeys: string[];
};

export type NormalizeFileResult = {
  detectedProfile: string;
  confidence: number;
  rows: NormalizeRowResult[];
  summary: { total: number; ok: number; failed: number };
};

const BN_RE = /[\u0980-\u09FF]/;

function isBn(text: string): boolean {
  return BN_RE.test(text);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function banglaDigitsToAscii(s: string): string {
  const map: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };
  return s.replace(/[০-৯]/g, (c) => map[c] ?? c);
}

function coerceType(raw: unknown): string | null {
  if (raw == null) return null;
  const key = String(raw).trim().toLowerCase();
  if ((INCIDENT_TYPE_CODES as readonly string[]).includes(key)) return key;
  return TYPE_SYNONYMS[key] ?? TYPE_SYNONYMS[String(raw).trim()] ?? null;
}

function parseDate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = banglaDigitsToAscii(String(raw).trim());
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'].forEach((p) =>
      u.searchParams.delete(p),
    );
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return url;
  }
}

function externalIdFromUrl(url: string): string {
  const hash = createHash('sha256').update(canonicalUrl(url)).digest('hex');
  return `sha256:${hash}`;
}

/** Optional banner / embed URLs (same shape as admin incident form). */
function extractMedia(
  flat: Record<string, unknown>,
): Record<string, string> | undefined {
  if (flat.media && typeof flat.media === 'object' && !Array.isArray(flat.media)) {
    const m = flat.media as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of ['image', 'youtube', 'facebook'] as const) {
      const v = m[k];
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    if (Object.keys(out).length) return out;
  }
  for (const key of [
    'imageUrl',
    'image_url',
    'ogImage',
    'og_image',
    'thumbnailUrl',
    'thumbnail',
  ]) {
    const v = flat[key];
    if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) {
      return { image: v.trim() };
    }
  }
  if (typeof flat.image === 'string' && /^https?:\/\//i.test(flat.image.trim())) {
    return { image: flat.image.trim() };
  }
  return undefined;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function flattenRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  if (raw._harvest && typeof raw._harvest === 'object') {
    const h = raw._harvest as Record<string, unknown>;
    if (h.guessed && typeof h.guessed === 'object') {
      Object.assign(out, h.guessed as Record<string, unknown>);
    }
  }
  if (raw.location && typeof raw.location === 'object') {
    const loc = raw.location as Record<string, unknown>;
    if (loc.lat != null) out.lat = loc.lat;
    if (loc.lng != null) out.lng = loc.lng;
  }
  return out;
}

function detectProfile(sample: Record<string, unknown>): {
  profile: string;
  confidence: number;
} {
  const keys = new Set(Object.keys(sample));
  if (keys.has('schemaVersion') && keys.has('externalId')) {
    return { profile: 'lashkoi-harvest-v1', confidence: 0.95 };
  }
  if (keys.has('divisionPcode') && keys.has('titleEn')) {
    return { profile: 'lashkoi-create-dto', confidence: 0.9 };
  }
  if (keys.has('headline') || keys.has('link')) {
    return { profile: 'generic-news', confidence: 0.75 };
  }
  return { profile: 'generic-news', confidence: 0.5 };
}

const FIELD_ALIASES: Record<string, string[]> = {
  type: ['type', 'category', 'incidentType', 'tags'],
  titleEn: ['titleEn', 'title_en', 'title', 'headline', 'name'],
  titleBn: ['titleBn', 'title_bn', 'শিরোনাম'],
  summaryEn: ['summaryEn', 'summary_en', 'summary', 'description'],
  summaryBn: ['summaryBn', 'summary_bn'],
  sourceUrl: ['sourceUrl', 'source_url', 'url', 'link', 'href'],
  sourceLabel: ['sourceLabel', 'source_label', 'source'],
  occurredAt: ['occurredAt', 'date', 'publishedAt', 'pubDate', 'datePublished'],
  placeNameEn: ['placeNameEn', 'district', 'place', 'area', 'location'],
  placeNameBn: ['placeNameBn', 'zila', 'জেলা'],
  divisionPcode: ['divisionPcode', 'division_pcode'],
  districtPcode: ['districtPcode', 'district_pcode'],
  lat: ['lat', 'latitude'],
  lng: ['lng', 'longitude'],
  caseCount: ['caseCount', 'case_count', 'cases'],
  externalId: ['externalId', 'external_id'],
};

@Injectable()
export class IncidentImportNormalizerService {
  parseContainer(
    raw: string,
    format: 'json' | 'jsonl' = 'json',
  ): Record<string, unknown>[] {
    if (format === 'jsonl') {
      return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Record<string, unknown>[];
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      for (const key of [
        'incidents',
        'items',
        'data',
        'results',
        'articles',
      ]) {
        const val = obj[key];
        if (Array.isArray(val)) return val as Record<string, unknown>[];
      }
      if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
        return (obj.features as Array<{ properties?: Record<string, unknown> }>).map(
          (f, i) => ({
            ...f.properties,
            ...(f as { geometry?: { coordinates?: number[] } }).geometry
              ?.coordinates
              ? {
                  lng: (f as { geometry: { coordinates: number[] } }).geometry
                    .coordinates[0],
                  lat: (f as { geometry: { coordinates: number[] } }).geometry
                    .coordinates[1],
                }
              : {},
            _featureIndex: i,
          }),
        );
      }
    }
    throw new Error('Unsupported JSON container');
  }

  normalizeItems(
    items: Record<string, unknown>[],
    profileHint?: string,
  ): NormalizeFileResult {
    const detected =
      items.length > 0
        ? detectProfile(items[0])
        : { profile: profileHint ?? 'generic-news', confidence: 0 };
    const profile = profileHint ?? detected.profile;
    const rows = items.map((item, index) =>
      this.normalizeOne(item, index, profile),
    );
    const ok = rows.filter((r) => r.ok).length;
    return {
      detectedProfile: profile,
      confidence: detected.confidence,
      rows,
      summary: { total: rows.length, ok, failed: rows.length - ok },
    };
  }

  private normalizeOne(
    raw: Record<string, unknown>,
    index: number,
    _profile: string,
  ): NormalizeRowResult {
    const mapped: Record<string, string> = {};
    const warnings: string[] = [];
    const errors: string[] = [];
    const flat = flattenRow(raw);
    const usedKeys = new Set<string>();

    const pick = (target: string): unknown => {
      for (const alias of FIELD_ALIASES[target] ?? [target]) {
        const v = flat[alias] ?? getPath(flat, alias);
        if (v !== undefined && v !== null && v !== '') {
          mapped[target] = alias;
          usedKeys.add(alias);
          return v;
        }
      }
      return undefined;
    };

    const type = coerceType(pick('type'));
    if (!type) errors.push('Unknown or missing incident type');

    let titleEn = pick('titleEn');
    let titleBn = pick('titleBn');
    if (titleEn && typeof titleEn === 'string' && isBn(titleEn) && !titleBn) {
      titleBn = titleEn;
      titleEn = undefined;
      warnings.push('translation');
    }
    if (titleBn && typeof titleBn === 'string' && !isBn(titleBn) && !titleEn) {
      titleEn = titleBn;
      titleBn = undefined;
    }
    if (!titleEn && titleBn) {
      titleEn = titleBn;
      warnings.push('translation');
    }
    if (!titleBn && titleEn && isBn(String(titleEn))) {
      titleBn = titleEn;
      titleEn = titleBn;
      warnings.push('translation');
    }
    if (!titleEn) errors.push('Missing title');

    let summaryEn = pick('summaryEn');
    let summaryBn = pick('summaryBn');
    if (summaryEn) summaryEn = stripHtml(String(summaryEn)).slice(0, 2000);
    if (summaryBn) summaryBn = stripHtml(String(summaryBn)).slice(0, 2000);
    if (!summaryEn && summaryBn) {
      summaryEn = summaryBn;
      if (!warnings.includes('translation')) warnings.push('translation');
    }
    if (!summaryEn) summaryEn = String(titleEn ?? '').slice(0, 500);

    const sourceUrlRaw = pick('sourceUrl');
    const sourceUrl =
      sourceUrlRaw != null ? canonicalUrl(String(sourceUrlRaw)) : null;
    if (!sourceUrl) errors.push('Missing source URL');

    let externalId = pick('externalId');
    if (!externalId && sourceUrl) externalId = externalIdFromUrl(sourceUrl);

    const occurredAt =
      parseDate(pick('occurredAt')) ?? new Date().toISOString();

    let lat = pick('lat');
    let lng = pick('lng');
    if (lat != null && lng != null) {
      let la = Number(lat);
      let ln = Number(lng);
      const inBox = (a: number, b: number) =>
        a >= BD_BBOX.minLat &&
        a <= BD_BBOX.maxLat &&
        b >= BD_BBOX.minLng &&
        b <= BD_BBOX.maxLng;
      if (!inBox(la, ln) && inBox(ln, la)) {
        warnings.push('lat/lng swapped');
        [la, ln] = [ln, la];
      }
      if (!inBox(la, ln)) {
        warnings.push('mapPin');
        lat = undefined;
        lng = undefined;
      } else {
        lat = la;
        lng = ln;
      }
    }

    const caseCountRaw = pick('caseCount');
    const caseCount =
      caseCountRaw != null
        ? Number(banglaDigitsToAscii(String(caseCountRaw)))
        : null;

    const placeNameEn = pick('placeNameEn');
    const placeNameBn = pick('placeNameBn');
    const sourceLabelVal = pick('sourceLabel');
    const divisionPcode = pick('divisionPcode');
    const districtPcode = pick('districtPcode');

    const unmappedKeys = Object.keys(flat).filter((k) => {
      if (k === '_harvest' || k.startsWith('_')) return false;
      if (usedKeys.has(k)) return false;
      const mappedFrom = Object.values(mapped);
      return !mappedFrom.includes(k);
    });

    if (errors.length) {
      return {
        index,
        ok: false,
        mapped,
        warnings,
        errors,
        unmappedKeys,
      };
    }

    const media = extractMedia(flat);
    if (media && !warnings.includes('media')) warnings.push('media');

    const row: Record<string, unknown> = {
      schemaVersion: 1,
      externalId: String(externalId),
      type,
      titleEn: String(titleEn),
      titleBn: titleBn ? String(titleBn) : null,
      summaryEn: String(summaryEn),
      summaryBn: summaryBn ? String(summaryBn) : null,
      placeNameEn: placeNameEn ? String(placeNameEn) : null,
      placeNameBn: placeNameBn ? String(placeNameBn) : null,
      sourceLabel: sourceLabelVal ? String(sourceLabelVal) : 'News import',
      sourceUrl,
      occurredAt,
      caseCount: Number.isFinite(caseCount) ? caseCount : null,
      divisionPcode: divisionPcode ? String(divisionPcode) : undefined,
      districtPcode: districtPcode ? String(districtPcode) : undefined,
      lat,
      lng,
      ...(media ? { media } : {}),
      needsReview: warnings,
    };

    return {
      index,
      ok: true,
      row,
      mapped,
      warnings,
      errors,
      unmappedKeys,
    };
  }
}
