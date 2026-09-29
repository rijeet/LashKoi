import { GeoJSON, useMap } from 'react-leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import type { PathOptions } from 'leaflet';
import type { Lang } from '@/types/api';
import { MapAreaLabels } from '@/components/map/MapAreaLabels';
import { bindAreaHoverTooltip } from '@/lib/geo-layer-tooltips';
import { DHAKA_DIVISION_PCODE } from '@/lib/dhaka-map';

type GeoCollection = GeoJSON.FeatureCollection;

function filterDivision(data: GeoCollection | null): GeoCollection | null {
  if (!data) return null;
  return {
    type: 'FeatureCollection',
    features: data.features.filter(
      (f) => f.properties?.divisionPcode === DHAKA_DIVISION_PCODE,
    ),
  };
}

type Props = {
  lang: Lang;
};

export function DhakaGeoLayers({ lang }: Props) {
  const map = useMap();
  const [districts, setDistricts] = useState<GeoCollection | null>(null);
  const [upazilas, setUpazilas] = useState<GeoCollection | null>(null);
  const [unions, setUnions] = useState<GeoCollection | null>(null);
  const [hoveredDistrictPcode, setHoveredDistrictPcode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/geo/bd-districts.json')
      .then((r) => r.json())
      .then((d: GeoCollection) => setDistricts(filterDivision(d)))
      .catch(() => setDistricts(null));
    fetch('/geo/bd-upazilas.json')
      .then((r) => r.json())
      .then((d: GeoCollection) => setUpazilas(filterDivision(d)))
      .catch(() => setUpazilas(null));
    fetch('/geo/bd-union-points.json')
      .then((r) => r.json())
      .then((d: GeoCollection) => setUnions(filterDivision(d)))
      .catch(() => setUnions(null));
  }, []);

  const divisionFeature = useMemo(() => {
    return districts?.features.length ? districts : null;
  }, [districts]);

  useEffect(() => {
    if (!divisionFeature?.features.length) return;
    const layer = L.geoJSON(divisionFeature as GeoJSON.GeoJsonObject);
    const bounds = layer.getBounds();
    layer.remove();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 10 });
    }
  }, [map, divisionFeature]);

  const upazilasInHoveredDistrict = useMemo(() => {
    if (!upazilas || !hoveredDistrictPcode) return null;
    return {
      type: 'FeatureCollection' as const,
      features: upazilas.features.filter(
        (f) => f.properties?.districtPcode === hoveredDistrictPcode,
      ),
    };
  }, [upazilas, hoveredDistrictPcode]);

  const unionsInHoveredDistrict = useMemo(() => {
    if (!unions || !hoveredDistrictPcode) return null;
    return {
      type: 'FeatureCollection' as const,
      features: unions.features.filter(
        (f) => f.properties?.districtPcode === hoveredDistrictPcode,
      ),
    };
  }, [unions, hoveredDistrictPcode]);

  const onEachDistrict = useCallback((feature: GeoJSON.Feature, layer: L.Layer) => {
    const pcode = feature.properties?.pcode as string | undefined;
    if (!pcode) return;
    layer.on({
      mouseover: () => setHoveredDistrictPcode(pcode),
      mouseout: () => setHoveredDistrictPcode(null),
    });
  }, []);

  const onEachUpazilaDisplay = useCallback((_f: GeoJSON.Feature, layer: L.Layer) => {
    if (layer instanceof L.Path) layer.options.interactive = false;
  }, []);

  const onEachUnion = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      bindAreaHoverTooltip(feature, layer, lang, 'union');
    },
    [lang],
  );

  const districtStyle = useCallback(
    (f?: GeoJSON.Feature): PathOptions => {
      const pcode = f?.properties?.pcode as string | undefined;
      const hovered = pcode === hoveredDistrictPcode;
      return {
        color: hovered ? '#22d3ee' : '#64748b',
        weight: hovered ? 2 : 1,
        fillColor: hovered ? '#164e63' : '#0f172a',
        fillOpacity: hovered ? 0.4 : 0.5,
      };
    },
    [hoveredDistrictPcode],
  );

  const upazilaStyle: PathOptions = {
    color: '#22d3ee',
    weight: 1,
    fillColor: '#164e63',
    fillOpacity: 0.45,
  };

  if (!districts) return null;

  return (
    <>
      <GeoJSON
        key={`dh-dist-${hoveredDistrictPcode ?? ''}`}
        data={districts}
        style={districtStyle}
        onEachFeature={onEachDistrict}
      />
      <MapAreaLabels data={districts} level="district" zoom={9} lang={lang} />

      {upazilasInHoveredDistrict && (
        <>
          <GeoJSON
            data={upazilasInHoveredDistrict}
            style={upazilaStyle}
            onEachFeature={onEachUpazilaDisplay}
          />
          <MapAreaLabels
            data={upazilasInHoveredDistrict}
            level="upazila"
            zoom={10}
            lang={lang}
            districtPcode={hoveredDistrictPcode ?? undefined}
          />
        </>
      )}

      {unionsInHoveredDistrict && unionsInHoveredDistrict.features.length > 0 && (
        <GeoJSON
          data={unionsInHoveredDistrict}
          pointToLayer={(_f, latlng) =>
            L.circleMarker(latlng, {
              radius: 5,
              weight: 1,
              color: '#94a3b8',
              fillColor: '#e2e8f0',
              fillOpacity: 0.85,
              interactive: true,
            })
          }
          onEachFeature={onEachUnion}
        />
      )}
    </>
  );
}
