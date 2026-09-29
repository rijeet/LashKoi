import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { BD_BOUNDS, BD_CENTER } from '@/lib/constants';

type Props = {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
};

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#22d3ee;border:2px solid #fff;box-shadow:0 0 8px #22d3ee"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function MapPointPicker({ lat, lng, onPick }: Props) {
  const position = [lat, lng] as [number, number];
  return (
    <div className="h-56 overflow-hidden rounded-lg border border-slate-700">
      <MapContainer
        center={position[0] && position[1] ? position : BD_CENTER}
        zoom={10}
        className="h-full w-full"
        maxBounds={BD_BOUNDS}
        minZoom={6}
        maxZoom={14}
      >
        <TileLayer
          attribution="&copy; OSM"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture onPick={onPick} />
        <Marker position={position} icon={pinIcon} />
      </MapContainer>
      <p className="border-t border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-500">
        Click map to set location ({lat.toFixed(4)}, {lng.toFixed(4)})
      </p>
    </div>
  );
}
