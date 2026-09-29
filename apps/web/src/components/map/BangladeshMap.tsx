import { MapContainer, useMap } from 'react-leaflet';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import { BD_BOUNDS, BD_CENTER } from '@/lib/constants';
import { GeoLayers } from '@/components/map/GeoLayers';
import { DhakaCityMapModal } from '@/components/map/DhakaCityMapModal';
import type { Lang } from '@/types/api';

function boundsKey(bounds: LatLngBoundsExpression): string {
  if (Array.isArray(bounds) && Array.isArray(bounds[0])) {
    const [[s, w], [n, e]] = bounds as [[number, number], [number, number]];
    return `${s},${w},${n},${e}`;
  }
  return JSON.stringify(bounds);
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  const key = boundsKey(bounds);
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, key, bounds]);
  return null;
}

type Props = {
  flyBounds?: LatLngBoundsExpression | null;
  flyCenter?: LatLngTuple | null;
  selectedDivision?: string;
  selectedDistrict?: string;
  lang?: Lang;
  healthChoropleth?: {
    byPcode: Map<string, number>;
    maxTotal: number;
    accentColor: string;
  } | null;
  children?: ReactNode;
};

export function BangladeshMap({
  flyBounds,
  flyCenter,
  selectedDivision,
  selectedDistrict,
  lang = 'en',
  healthChoropleth = null,
  children,
}: Props) {
  const [dhakaMapOpen, setDhakaMapOpen] = useState(false);

  const onDhakaMapHover = useCallback((active: boolean) => {
    if (active) setDhakaMapOpen(true);
  }, []);

  const closeDhakaModal = useCallback(() => {
    setDhakaMapOpen(false);
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={BD_CENTER}
        zoom={7}
        className="h-full w-full"
        maxBounds={BD_BOUNDS}
        minZoom={6}
        maxZoom={12}
        zoomControl={false}
      >
        <FitBounds bounds={flyBounds ?? BD_BOUNDS} />
        {flyCenter && <FlyTo center={flyCenter} />}
        <GeoLayers
          selectedDivision={selectedDivision}
          selectedDistrict={selectedDistrict}
          lang={lang}
          onDhakaMapHover={onDhakaMapHover}
          healthChoropleth={healthChoropleth}
        />
        {children}
      </MapContainer>
      <DhakaCityMapModal
        open={dhakaMapOpen}
        lang={lang}
        onRequestClose={closeDhakaModal}
      />
    </div>
  );
}

function FlyTo({ center }: { center: LatLngTuple }) {
  const map = useMap();
  const lat = center[0];
  const lng = center[1];
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 10), { duration: 0.8 });
  }, [map, lat, lng]);
  return null;
}
