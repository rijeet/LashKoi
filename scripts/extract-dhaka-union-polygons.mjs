/**
 * Build Dhaka district (BD3026) ADM4 union polygons for the city modal.
 * Joins geoBoundaries ADM4 shapes with election union points (point-in-polygon).
 *
 * Usage: node scripts/extract-dhaka-union-polygons.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ADM4 =
  process.env.ADM4_GEOJSON ??
  'E:\\election_file_2026\\geoBoundaries-BGD-ADM4_simplified.geojson';
const UNION_POINTS = path.join(ROOT, 'apps/web/public/geo/bd-union-points.json');
const OUT = path.join(ROOT, 'apps/web/public/geo/bd-dhaka-union-polygons.json');
const DHAKA_DISTRICT = 'BD3026';

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng, lat, geom) {
  if (geom.type === 'Polygon') {
    return pointInRing(lng, lat, geom.coordinates[0]);
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some((poly) => pointInRing(lng, lat, poly[0]));
  }
  return false;
}

function decimateRing(ring, max = 48) {
  if (ring.length <= max) return ring;
  const step = Math.ceil(ring.length / max);
  const out = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  const last = ring[ring.length - 1];
  const tail = out[out.length - 1];
  if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
  return out;
}

function simplifyGeom(geom) {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map((r) => decimateRing(r)),
    };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly) =>
        poly.map((r) => decimateRing(r)),
      ),
    };
  }
  return geom;
}

function main() {
  if (!fs.existsSync(ADM4)) {
    console.error('Missing ADM4:', ADM4);
    process.exit(1);
  }
  const adm4 = JSON.parse(fs.readFileSync(ADM4, 'utf8'));
  const unions = JSON.parse(fs.readFileSync(UNION_POINTS, 'utf8'));
  const dhakaPoints = unions.features.filter(
    (f) => f.properties?.districtPcode === DHAKA_DISTRICT,
  );

  const features = [];
  for (const poly of adm4.features) {
    let hit = null;
    for (const pt of dhakaPoints) {
      const [lng, lat] = pt.geometry.coordinates;
      if (pointInPolygon(lng, lat, poly.geometry)) {
        hit = pt.properties;
        break;
      }
    }
    if (!hit) {
      const name = (poly.properties?.shapeName ?? '').toLowerCase();
      hit = dhakaPoints.find(
        (pt) => (pt.properties?.nameEn ?? '').toLowerCase() === name,
      )?.properties;
    }
    if (!hit) continue;

    features.push({
      type: 'Feature',
      properties: {
        pcode: hit.pcode,
        nameEn: hit.nameEn,
        nameBn: hit.nameBn ?? null,
        divisionPcode: hit.divisionPcode,
        districtPcode: hit.districtPcode,
        upazilaPcode: hit.upazilaPcode,
        shapeName: poly.properties?.shapeName ?? hit.nameEn,
      },
      geometry: simplifyGeom(poly.geometry),
    });
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify({ type: 'FeatureCollection', features }),
  );
  console.log('Wrote', OUT, features.length, 'union polygons for', DHAKA_DISTRICT);
}

main();
