import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';
import type { Lang } from '@/types/api';
import {
  districtFontPx,
  divisionFontPx,
  resolveAreaLabel,
  unionFontPx,
  upazilaFontPx,
} from '@/lib/geo-names';

type GeoCollection = GeoJSON.FeatureCollection;

type LabelLevel = 'division' | 'district' | 'upazila' | 'union';

type Props = {
  data: GeoCollection;
  level: LabelLevel;
  zoom: number;
  lang: Lang;
  divisionPcode?: string;
  districtPcode?: string;
  className?: string;
};

function positionOf(feature: GeoJSON.Feature): [number, number] | null {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === 'Point') {
    const [lng, lat] = g.coordinates as [number, number];
    return [lat, lng];
  }
  const layer = L.geoJSON(feature as GeoJSON.GeoJsonObject);
  const c = layer.getBounds().getCenter();
  layer.remove();
  return [c.lat, c.lng];
}

function labelIcon(name: string, fontPx: number, lang: Lang, extraClass?: string) {
  const langClass = lang === 'bn' ? ' lk-map-label--bn' : '';
  const mod = extraClass ? ` ${extraClass}` : '';
  return L.divIcon({
    className: '',
    html: `<div class="lk-map-label${langClass}${mod}" style="font-size:${fontPx}px">${escapeHtml(name)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fontForLevel(level: LabelLevel, zoom: number): number {
  switch (level) {
    case 'division':
      return divisionFontPx(zoom);
    case 'district':
      return districtFontPx(zoom);
    case 'upazila':
      return upazilaFontPx(zoom);
    case 'union':
      return unionFontPx(zoom);
  }
}

function featureMatches(
  p: Record<string, unknown>,
  level: LabelLevel,
  divisionPcode?: string,
  districtPcode?: string,
): boolean {
  if (level === 'district' && divisionPcode && p.divisionPcode !== divisionPcode) {
    return false;
  }
  if (level === 'upazila' || level === 'union') {
    if (districtPcode && p.districtPcode !== districtPcode) return false;
    if (!districtPcode && divisionPcode && p.divisionPcode !== divisionPcode) {
      return false;
    }
  }
  return true;
}

export function MapAreaLabels({
  data,
  level,
  zoom,
  lang,
  divisionPcode,
  districtPcode,
  className,
}: Props) {
  const fontPx = fontForLevel(level, zoom);

  const markers = useMemo(() => {
    return data.features
      .map((feature) => {
        const p = feature.properties ?? {};
        if (!featureMatches(p, level, divisionPcode, districtPcode)) return null;
        const name = resolveAreaLabel(lang, {
          nameEn: p.nameEn as string | undefined,
          nameBn: p.nameBn as string | undefined,
          pcode: p.pcode as string | undefined,
          level,
        });
        const position = positionOf(feature);
        if (!position || !name) return null;
        return { key: String(p.pcode ?? name), name, position };
      })
      .filter(Boolean) as Array<{ key: string; name: string; position: [number, number] }>;
  }, [data, level, lang, fontPx, divisionPcode, districtPcode]);

  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.key}
          position={m.position}
          icon={labelIcon(m.name, fontPx, lang, className)}
          interactive={false}
          keyboard={false}
        />
      ))}
    </>
  );
}
