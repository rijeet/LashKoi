import { MapContainer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import { GeoLayers } from '@/components/map/GeoLayers';
import { DHAKA_DISTRICT_PCODE } from '@/lib/dhaka-map';
import type { Lang } from '@/types/api';

/** Fallback if district GeoJSON is slow to load */
const DHAKA_CITY_FALLBACK_BOUNDS: L.LatLngBoundsExpression = [
  [23.68, 90.28],
  [23.92, 90.52],
];

function FitDhakaDistrict() {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    fetch('/geo/bd-districts.json')
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        if (cancelled) return;
        const feature = data.features.find(
          (f) => f.properties?.pcode === DHAKA_DISTRICT_PCODE,
        );
        if (feature) {
          const layer = L.geoJSON(feature as GeoJSON.GeoJsonObject);
          const bounds = layer.getBounds();
          map.fitBounds(bounds, { padding: [28, 28] });
          map.setMaxBounds(bounds.pad(0.04));
          layer.remove();
          return;
        }
        map.fitBounds(DHAKA_CITY_FALLBACK_BOUNDS, { padding: [28, 28] });
      })
      .catch(() => {
        if (!cancelled) map.fitBounds(DHAKA_CITY_FALLBACK_BOUNDS, { padding: [28, 28] });
      });
    return () => {
      cancelled = true;
    };
  }, [map]);

  return null;
}

type Props = {
  lang: Lang;
};

export function DhakaCityMapEmbed({ lang }: Props) {
  return (
    <MapContainer
      center={[23.81, 90.4]}
      zoom={11}
      className="lk-dhaka-modal__map"
      minZoom={10}
      maxZoom={14}
      zoomControl
      attributionControl={false}
    >
      <FitDhakaDistrict />
      <GeoLayers
        selectedDistrict={DHAKA_DISTRICT_PCODE}
        lang={lang}
        context="dhaka-modal"
      />
    </MapContainer>
  );
}
