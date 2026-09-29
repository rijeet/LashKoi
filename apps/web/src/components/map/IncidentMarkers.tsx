import { useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { IncidentsGeoJsonDto } from '@/types/api';
import { toLeafletLatLng } from '@/lib/mappers';
import { incidentMarkerHtml } from '@/lib/incident-icons';

const CLUSTER_MIN = 8;

function markerIcon(iconKey: string, color: string, selected: boolean) {
  const html = incidentMarkerHtml(iconKey, color, selected);
  const size = selected ? 36 : 30;
  return L.divIcon({
    className: '',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

type ClusterProps = {
  data: IncidentsGeoJsonDto;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

function IncidentMarkerCluster({ data, selectedSlug, onSelect }: ClusterProps) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 52,
      spiderfyOnMaxZoom: true,
    });

    for (const f of data.features) {
      const p = f.properties;
      const marker = L.marker(toLeafletLatLng(f.geometry.coordinates), {
        icon: markerIcon(p.iconKey, p.markerColor, p.slug === selectedSlug),
      });
      marker.bindPopup(`<span class="text-sm font-medium">${escapeHtml(p.headline)}</span>`);
      marker.on('click', () => onSelectRef.current(p.slug));
      group.addLayer(marker);
    }

    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      group.clearLayers();
    };
  }, [data, selectedSlug, map]);

  return null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type Props = {
  data: IncidentsGeoJsonDto | undefined;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

export function IncidentMarkers({ data, selectedSlug, onSelect }: Props) {
  if (!data?.features?.length) return null;

  if (data.features.length >= CLUSTER_MIN) {
    return (
      <IncidentMarkerCluster
        data={data}
        selectedSlug={selectedSlug}
        onSelect={onSelect}
      />
    );
  }

  return (
    <>
      {data.features.map((f) => {
        const p = f.properties;
        const pos = toLeafletLatLng(f.geometry.coordinates);
        return (
          <Marker
            key={p.id}
            position={pos}
            icon={markerIcon(p.iconKey, p.markerColor, p.slug === selectedSlug)}
            eventHandlers={{
              click: () => onSelect(p.slug),
            }}
          >
            <Popup>
              <span className="text-sm font-medium">{p.headline}</span>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
