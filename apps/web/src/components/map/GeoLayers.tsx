import { GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import type { LatLngBounds, PathOptions } from 'leaflet';
import type { Lang } from '@/types/api';
import { MapAreaLabels } from '@/components/map/MapAreaLabels';
import {
  bindAreaHoverTooltip,
  bindDhakaUnionPolygonTooltip,
} from '@/lib/geo-layer-tooltips';
import type { DnccWardIndex } from '@/lib/dhaka-dncc-wards';
import { DHAKA_DISTRICT_PCODE } from '@/lib/dhaka-map';
import { healthDistrictFill } from '@/lib/health-choropleth';

const upazilaHighlightStyle: PathOptions = {
  color: '#22d3ee',
  weight: 1.25,
  fillColor: '#164e63',
  fillOpacity: 0.5,
};

const upazilaModalStyle: PathOptions = {
  color: '#a78bfa',
  weight: 1,
  fillColor: '#5b21b6',
  fillOpacity: 0.22,
};

const unionPolygonStyle: PathOptions = {
  color: '#fb923c',
  weight: 0.65,
  fillColor: '#f97316',
  fillOpacity: 0.18,
};

const unionPolygonHoverStyle: PathOptions = {
  color: '#fdba74',
  weight: 1.5,
  fillColor: '#fb923c',
  fillOpacity: 0.35,
};

type GeoCollection = GeoJSON.FeatureCollection;

type Props = {
  selectedDivision?: string;
  selectedDistrict?: string;
  lang: Lang;
  onDhakaMapHover?: (active: boolean) => void;
  /** Embedded Dhaka detail map inside modal (no SVG / no re-open modal). */
  context?: 'main' | 'dhaka-modal';
  healthChoropleth?: {
    byPcode: Map<string, number>;
    maxTotal: number;
    accentColor: string;
  } | null;
};

const divisionStyle = (pcode: string | undefined, selected: string): PathOptions => ({
  color: pcode === selected && selected ? '#22d3ee' : '#475569',
  weight: pcode === selected && selected ? 2 : 1,
  fillColor: pcode === selected && selected ? '#164e63' : '#1e293b',
  fillOpacity: 0.75,
});

const divisionOutlineStyle = (): PathOptions => ({
  color: '#334155',
  weight: 1.5,
  fillOpacity: 0,
  fillColor: 'transparent',
});

function filterCollection(
  data: GeoCollection,
  predicate: (p: Record<string, unknown>) => boolean,
): GeoCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.filter((f) => predicate(f.properties ?? {})),
  };
}

export function GeoLayers({
  selectedDivision,
  selectedDistrict,
  lang,
  onDhakaMapHover,
  context = 'main',
  healthChoropleth = null,
}: Props) {
  const isDhakaModal = context === 'dhaka-modal';
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [bounds, setBounds] = useState<LatLngBounds>(map.getBounds());
  const [divisions, setDivisions] = useState<GeoCollection | null>(null);
  const [districts, setDistricts] = useState<GeoCollection | null>(null);
  const [upazilas, setUpazilas] = useState<GeoCollection | null>(null);
  const [unions, setUnions] = useState<GeoCollection | null>(null);
  const [unionPolygons, setUnionPolygons] = useState<GeoCollection | null>(null);
  const [dnccWards, setDnccWards] = useState<DnccWardIndex | null>(null);
  const [hoveredDistrictPcode, setHoveredDistrictPcode] = useState<string | null>(null);

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setBounds(map.getBounds()),
  });

  useEffect(() => {
    fetch('/geo/bd-divisions.json')
      .then((r) => r.json())
      .then(setDivisions)
      .catch(() => setDivisions(null));
    fetch('/geo/bd-districts.json')
      .then((r) => r.json())
      .then(setDistricts)
      .catch(() => setDistricts(null));
    fetch('/geo/bd-upazilas.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUpazilas(d))
      .catch(() => setUpazilas(null));
    fetch('/geo/bd-union-points.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUnions(d))
      .catch(() => setUnions(null));
  }, []);

  useEffect(() => {
    if (!isDhakaModal) return;
    fetch('/geo/bd-dhaka-union-polygons.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUnionPolygons(d))
      .catch(() => setUnionPolygons(null));
    fetch('/geo/dhaka-dncc-wards.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDnccWards(d))
      .catch(() => setDnccWards(null));
  }, [isDhakaModal]);

  const unionZoomMin = isDhakaModal ? 10 : 10;
  const unionCap = isDhakaModal ? 280 : 120;
  const healthMapActive = Boolean(healthChoropleth && !isDhakaModal);
  const showDistrictFill =
    (isDhakaModal || zoom >= 8 || healthMapActive) && districts;
  const showUnionPointHover =
    zoom >= unionZoomMin && unions && !(isDhakaModal && unionPolygons);
  const showUnionPolygons = isDhakaModal && unionPolygons && zoom >= 10;
  const activeDistrictForUpazila = isDhakaModal
    ? DHAKA_DISTRICT_PCODE
    : showDistrictFill
      ? hoveredDistrictPcode
      : null;

  const scopedDistricts = useMemo(() => {
    if (!districts) return null;
    if (isDhakaModal && selectedDistrict) {
      return filterCollection(
        districts,
        (p) =>
          p.pcode === selectedDistrict || p.districtPcode === selectedDistrict,
      );
    }
    if (!selectedDivision) return districts;
    return filterCollection(
      districts,
      (p) => p.divisionPcode === selectedDivision,
    );
  }, [districts, selectedDivision, selectedDistrict, isDhakaModal]);

  const upazilasInHoveredDistrict = useMemo(() => {
    if (!upazilas || !activeDistrictForUpazila) return null;
    return filterCollection(
      upazilas,
      (p) => p.districtPcode === activeDistrictForUpazila,
    );
  }, [upazilas, activeDistrictForUpazila]);

  const unionsInView = useMemo(() => {
    if (!unions || !showUnionPointHover) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    const features = unions.features.filter((f) => {
      const p = f.properties ?? {};
      if (selectedDistrict && p.districtPcode !== selectedDistrict) return false;
      if (!selectedDistrict && selectedDivision && p.divisionPcode !== selectedDivision) {
        return false;
      }
      const g = f.geometry;
      if (g?.type !== 'Point') return false;
      const [lng, lat] = g.coordinates as [number, number];
      return bounds.contains([lat, lng]);
    });
    return {
      type: 'FeatureCollection' as const,
      features: features.slice(0, unionCap),
    };
  }, [unions, showUnionPointHover, bounds, selectedDivision, selectedDistrict, unionCap]);

  const onEachDistrictHover = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      const pcode = feature.properties?.pcode as string | undefined;
      if (!pcode) return;
      if (healthChoropleth) {
        const cases = healthChoropleth.byPcode.get(pcode) ?? 0;
        const name =
          (lang === 'bn'
            ? feature.properties?.nameBn
            : feature.properties?.nameEn) ??
          feature.properties?.nameEn ??
          pcode;
        layer.bindTooltip(
          `<span class="text-xs">${name}<br/><strong>${cases}</strong> cases</span>`,
          { sticky: true, className: 'lk-map-tooltip' },
        );
      }
      layer.on({
        mouseover: () => {
          setHoveredDistrictPcode(pcode);
          if (
            !isDhakaModal &&
            pcode === DHAKA_DISTRICT_PCODE &&
            zoom >= 8 &&
            onDhakaMapHover
          ) {
            onDhakaMapHover(true);
          }
        },
        mouseout: () => {
          setHoveredDistrictPcode(null);
          if (!isDhakaModal && pcode === DHAKA_DISTRICT_PCODE && onDhakaMapHover) {
            onDhakaMapHover(false);
          }
        },
      });
    },
    [onDhakaMapHover, isDhakaModal, zoom, healthChoropleth, lang],
  );

  const onEachUnionPolygon = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      if (dnccWards) {
        bindDhakaUnionPolygonTooltip(feature, layer, lang, dnccWards);
      } else {
        bindAreaHoverTooltip(feature, layer, lang, 'union');
      }
      if (layer instanceof L.Path) {
        layer.on({
          mouseover: () => layer.setStyle(unionPolygonHoverStyle),
          mouseout: () => layer.setStyle(unionPolygonStyle),
        });
      }
    },
    [lang, dnccWards],
  );

  const onEachUpazilaDisplay = useCallback((_feature: GeoJSON.Feature, layer: L.Layer) => {
    if (layer instanceof L.Path) {
      layer.options.interactive = false;
    }
  }, []);

  const onEachUnion = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      bindAreaHoverTooltip(feature, layer, lang, 'union');
    },
    [lang],
  );

  return (
    <>
      {!isDhakaModal && divisions && !showDistrictFill && !healthMapActive && (
        <>
          <GeoJSON
            key={`div-${selectedDivision}`}
            data={divisions}
            style={(f) =>
              divisionStyle(
                f?.properties?.pcode as string | undefined,
                selectedDivision ?? '',
              )
            }
          />
          <MapAreaLabels
            data={divisions}
            level="division"
            zoom={zoom}
            lang={lang}
          />
        </>
      )}

      {divisions && showDistrictFill && !isDhakaModal && (
        <GeoJSON data={divisions} style={divisionOutlineStyle} />
      )}

      {showDistrictFill && scopedDistricts && (
        <>
          <GeoJSON
            key={`dist-${hoveredDistrictPcode ?? ''}-${selectedDistrict ?? ''}`}
            data={scopedDistricts}
            style={(f) => {
              const pcode = f?.properties?.pcode as string | undefined;
              const selected = pcode === selectedDistrict && selectedDistrict;
              const hovered = pcode === hoveredDistrictPcode && hoveredDistrictPcode;
              if (healthChoropleth && pcode) {
                const cases = healthChoropleth.byPcode.get(pcode) ?? 0;
                const { fillColor, fillOpacity } = healthDistrictFill(
                  cases,
                  healthChoropleth.maxTotal,
                  healthChoropleth.accentColor,
                );
                return {
                  color: hovered || selected ? '#22d3ee' : '#475569',
                  weight: hovered || selected ? 2 : 0.75,
                  fillColor,
                  fillOpacity,
                };
              }
              return {
                color: hovered || selected ? '#22d3ee' : '#64748b',
                weight: hovered || selected ? 2 : 1,
                fillColor: hovered || selected ? '#164e63' : '#0f172a',
                fillOpacity: hovered ? 0.35 : 0.55,
              };
            }}
            onEachFeature={isDhakaModal ? undefined : onEachDistrictHover}
          />
          {!isDhakaModal && (
            <MapAreaLabels
              data={scopedDistricts}
              level="district"
              zoom={zoom}
              lang={lang}
              divisionPcode={selectedDivision || undefined}
            />
          )}
        </>
      )}

      {upazilasInHoveredDistrict && (
        <>
          <GeoJSON
            key={`upa-${activeDistrictForUpazila}-${lang}`}
            data={upazilasInHoveredDistrict}
            style={isDhakaModal ? upazilaModalStyle : upazilaHighlightStyle}
            onEachFeature={onEachUpazilaDisplay}
          />
          <MapAreaLabels
            data={upazilasInHoveredDistrict}
            level="upazila"
            zoom={zoom}
            lang={lang}
            districtPcode={activeDistrictForUpazila ?? undefined}
          />
        </>
      )}

      {showUnionPolygons && unionPolygons && (
        <GeoJSON
          key={`upa4-${lang}-${dnccWards ? 'w' : 'n'}`}
          data={unionPolygons}
          style={unionPolygonStyle}
          onEachFeature={onEachUnionPolygon}
        />
      )}

      {showUnionPointHover && unionsInView.features.length > 0 && (
        <GeoJSON
          key={`uni-hover-${lang}-${selectedDivision ?? ''}-${selectedDistrict ?? ''}`}
          data={unionsInView}
          pointToLayer={(_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 10,
              weight: 0,
              opacity: 0,
              fillOpacity: 0,
              interactive: true,
            })
          }
          onEachFeature={onEachUnion}
        />
      )}
    </>
  );
}
