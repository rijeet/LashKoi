import { BangladeshMap } from '@/components/map/BangladeshMap';
import { IncidentMarkers } from '@/components/map/IncidentMarkers';
import type { IncidentsGeoJsonDto } from '@/types/api';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';

type Props = {
  flyBounds: LatLngBoundsExpression | null;
  flyCenter: LatLngTuple | null;
  selectedDivision: string;
  selectedDistrict: string;
  lang: 'en' | 'bn';
  incidents: IncidentsGeoJsonDto | undefined;
  incidentSlug: string;
  onSelectIncident: (slug: string) => void;
  healthChoropleth?: {
    byPcode: Map<string, number>;
    maxTotal: number;
    accentColor: string;
  } | null;
};

export function MapView({
  flyBounds,
  flyCenter,
  selectedDivision,
  selectedDistrict,
  lang,
  incidents,
  incidentSlug,
  onSelectIncident,
  healthChoropleth = null,
}: Props) {
  return (
    <BangladeshMap
      flyBounds={flyBounds}
      flyCenter={flyCenter}
      selectedDivision={selectedDivision}
      selectedDistrict={selectedDistrict}
      lang={lang}
      healthChoropleth={healthChoropleth}
    >
      <IncidentMarkers
        data={incidents}
        selectedSlug={incidentSlug}
        onSelect={onSelectIncident}
      />
    </BangladeshMap>
  );
}
