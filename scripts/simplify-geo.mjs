/**
 * Election GeoJSON → apps/web/public/geo (decimated polygons + union points).
 * Usage: npm run web:geo
 */
import fs from 'fs';
import path from 'path';
import { ROOT, REF_GEO } from './paths.mjs';

const ELECTION = process.env.ELECTION_GEOJSON_DIR
  ?? 'E:\\election_file_2026\\bgd_admin_boundaries.geojson';
const OUT = path.join(ROOT, 'apps', 'web', 'public', 'geo');
const BN_DATA = path.join(REF_GEO, 'bangladesh-geojson', 'src', 'data');

function decimateRing(ring, maxPoints = 80) {
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const out = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  const last = ring[ring.length - 1];
  const tail = out[out.length - 1];
  if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
  return out;
}

function simplifyGeometry(geom, maxPoints) {
  if (!geom) return geom;
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map((r) => decimateRing(r, maxPoints)),
    };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly) =>
        poly.map((r) => decimateRing(r, maxPoints)),
      ),
    };
  }
  return geom;
}

function loadBnLookups() {
  const divBn = new Map();
  const distBn = new Map();
  try {
    const divJson = JSON.parse(
      fs.readFileSync(path.join(BN_DATA, 'bd-divisions.json'), 'utf8'),
    );
    for (const d of divJson.divisions ?? []) {
      divBn.set(d.name.toLowerCase(), d.bn_name);
    }
    const distJson = JSON.parse(
      fs.readFileSync(path.join(BN_DATA, 'bd-districts.json'), 'utf8'),
    );
    for (const d of distJson.districts ?? []) {
      distBn.set(d.name.toLowerCase(), d.bn_name);
    }
  } catch {
    /* optional */
  }
  return { divBn, distBn };
}

const { divBn, distBn } = loadBnLookups();

function bnFor(nameEn, level) {
  const key = (nameEn ?? '').toLowerCase();
  if (level === 'division') return divBn.get(key) ?? null;
  if (level === 'district') return distBn.get(key) ?? null;
  return null;
}

function toFeatureCollection(filePath, propsFn, maxPoints) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const features = raw.features.map((f) => {
    const p = f.properties ?? {};
    const built = propsFn(p);
    return {
      type: 'Feature',
      properties: built,
      geometry: simplifyGeometry(f.geometry, maxPoints),
    };
  });
  return { type: 'FeatureCollection', features };
}

fs.mkdirSync(OUT, { recursive: true });

const admin1 = path.join(ELECTION, 'bgd_admin1.geojson');
const admin2 = path.join(ELECTION, 'bgd_admin2.geojson');
const admin3 = path.join(ELECTION, 'bgd_admin3.geojson');
const adminPoints = path.join(ELECTION, 'bgd_adminpoints.geojson');

if (!fs.existsSync(admin1)) {
  console.error('Missing', admin1);
  process.exit(1);
}

const divisions = toFeatureCollection(
  admin1,
  (p) => {
    const nameEn = p.adm1_name ?? p.name;
    return {
      pcode: p.adm1_pcode,
      nameEn,
      nameBn: p.adm1_name1 ?? bnFor(nameEn, 'division'),
      divisionPcode: p.adm1_pcode,
    };
  },
  120,
);
fs.writeFileSync(path.join(OUT, 'bd-divisions.json'), JSON.stringify(divisions));
console.log('Wrote bd-divisions.json', divisions.features.length);

if (fs.existsSync(admin2)) {
  const districts = toFeatureCollection(
    admin2,
    (p) => {
      const nameEn = p.adm2_name ?? p.name;
      return {
        pcode: p.adm2_pcode,
        nameEn,
        nameBn: p.adm2_name1 ?? bnFor(nameEn, 'district'),
        divisionPcode: p.adm1_pcode,
        districtPcode: p.adm2_pcode,
      };
    },
    60,
  );
  fs.writeFileSync(path.join(OUT, 'bd-districts.json'), JSON.stringify(districts));
  console.log('Wrote bd-districts.json', districts.features.length);
}

if (fs.existsSync(admin3)) {
  const upazilas = toFeatureCollection(
    admin3,
    (p) => ({
      pcode: p.adm3_pcode,
      nameEn: p.adm3_name ?? p.name,
      nameBn: p.adm3_name1 ?? null,
      divisionPcode: p.adm1_pcode,
      districtPcode: p.adm2_pcode,
    }),
    40,
  );
  fs.writeFileSync(path.join(OUT, 'bd-upazilas.json'), JSON.stringify(upazilas));
  console.log('Wrote bd-upazilas.json', upazilas.features.length);
}

if (fs.existsSync(adminPoints)) {
  const raw = JSON.parse(fs.readFileSync(adminPoints, 'utf8'));
  const unionFeatures = raw.features
    .filter((f) => Number(f.properties?.admin_level) === 4)
    .map((f) => {
      const p = f.properties ?? {};
      const nameEn = String(p.name ?? p.adm4_name ?? '');
      const [lng, lat] = f.geometry.coordinates;
      return {
        type: 'Feature',
        properties: {
          pcode: p.adm4_pcode,
          nameEn,
          nameBn: p.adm4_name1 ?? null,
          divisionPcode: p.adm1_pcode,
          districtPcode: p.adm2_pcode,
          upazilaPcode: p.adm3_pcode,
        },
        geometry: { type: 'Point', coordinates: [lng, lat] },
      };
    });
  fs.writeFileSync(
    path.join(OUT, 'bd-union-points.json'),
    JSON.stringify({ type: 'FeatureCollection', features: unionFeatures }),
  );
  console.log('Wrote bd-union-points.json', unionFeatures.length);
}
