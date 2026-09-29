import { resolveAreaLabel } from '@/lib/geo-names';
import type { BoundaryAreaDto, Lang } from '@/types/api';

type GeoFeature = GeoJSON.Feature & {
  properties: {
    pcode?: string;
    nameEn?: string;
    nameBn?: string | null;
    divisionPcode?: string | null;
    districtPcode?: string | null;
  };
};

let districtsCache: GeoJSON.FeatureCollection | null = null;

async function loadDistrictsGeo(): Promise<GeoJSON.FeatureCollection> {
  if (districtsCache) return districtsCache;
  const res = await fetch('/geo/bd-districts.json');
  if (!res.ok) throw new Error('districts geo');
  districtsCache = await res.json();
  return districtsCache!;
}

export async function districtsFromGeoJson(
  divisionPcode: string,
  lang: Lang,
): Promise<BoundaryAreaDto[]> {
  const geo = await loadDistrictsGeo();
  return (geo.features as GeoFeature[])
    .filter((f) => f.properties.divisionPcode === divisionPcode)
    .map((f) => {
      const p = f.properties;
      const nameEn = p.nameEn ?? '';
      return {
        pcode: p.pcode ?? '',
        name: resolveAreaLabel(lang, {
          nameEn,
          nameBn: p.nameBn,
          pcode: p.pcode,
          level: 'district',
        }),
        nameEn,
        nameBn: p.nameBn ?? nameEn,
        centroid: null,
        bbox: null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
