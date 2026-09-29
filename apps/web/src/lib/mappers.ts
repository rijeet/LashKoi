/** GeoJSON [lng, lat] → Leaflet [lat, lng] */
export function toLeafletLatLng(coords: [number, number]): [number, number] {
  return [coords[1], coords[0]];
}
