import { MapContainer } from 'react-leaflet';
import type { Lang } from '@/types/api';
import { DhakaGeoLayers } from '@/components/map/DhakaGeoLayers';

/** Dhaka division center — fitBounds runs when layers load. */
const DHAKA_MAP_CENTER: [number, number] = [24.0, 90.25];

type Props = {
  lang: Lang;
};

export function DhakaDetailMap({ lang }: Props) {
  return (
    <MapContainer
      center={DHAKA_MAP_CENTER}
      zoom={8}
      className="lk-dhaka-modal__map h-full w-full min-h-[280px]"
      minZoom={7}
      maxZoom={14}
      zoomControl
      attributionControl={false}
    >
      <DhakaGeoLayers lang={lang} />
    </MapContainer>
  );
}
