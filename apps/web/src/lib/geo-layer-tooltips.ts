import type { Layer } from 'leaflet';
import type { Lang } from '@/types/api';
import { resolveAreaLabel } from '@/lib/geo-names';
import {
  buildDhakaUnionTooltipHtml,
  type DnccWardIndex,
} from '@/lib/dhaka-dncc-wards';

type TooltipLevel = 'upazila' | 'union';

export function bindDhakaUnionPolygonTooltip(
  feature: GeoJSON.Feature,
  layer: Layer,
  lang: Lang,
  wardIndex: DnccWardIndex,
) {
  const p = feature.properties ?? {};
  const unionLabel = resolveAreaLabel(lang, {
    nameEn: p.nameEn as string | undefined,
    nameBn: p.nameBn as string | undefined,
    pcode: p.pcode as string | undefined,
    level: 'union',
  });
  if (!unionLabel) return;

  const html = buildDhakaUnionTooltipHtml(
    lang,
    unionLabel,
    wardIndex,
    p.nameEn as string | undefined,
    p.nameBn as string | undefined,
  );

  layer.bindTooltip(html, {
    sticky: true,
    direction: 'top',
    opacity: 0.97,
    className: `lk-map-tooltip lk-map-tooltip--rich${
      lang === 'bn' ? ' lk-map-tooltip--bn' : ''
    }`,
  });
}

export function bindAreaHoverTooltip(
  feature: GeoJSON.Feature,
  layer: Layer,
  lang: Lang,
  level: TooltipLevel,
) {
  const p = feature.properties ?? {};
  const name = resolveAreaLabel(lang, {
    nameEn: p.nameEn as string | undefined,
    nameBn: p.nameBn as string | undefined,
    pcode: p.pcode as string | undefined,
    level,
  });
  if (!name) return;

  layer.bindTooltip(name, {
    sticky: true,
    direction: 'top',
    opacity: 0.95,
    className: `lk-map-tooltip${lang === 'bn' ? ' lk-map-tooltip--bn' : ''}`,
  });
}
