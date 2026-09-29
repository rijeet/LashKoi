import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const geoUpa = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/web/public/geo/bd-upazilas.json')));
const geoUni = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/web/public/geo/bd-union-points.json')));

function unionUpazilaPcode(districtPcode, fullUpazilaPcode) {
  const suffix = fullUpazilaPcode.slice(districtPcode.length);
  const trimmed = suffix.replace(/^0+/, '') || '0';
  return districtPcode + trimmed.padStart(3, '0');
}

const kum = geoUpa.features.find((f) => f.properties.nameEn === 'Kumarkhali');
console.log('kum', kum?.properties);
if (kum) {
  const key = unionUpazilaPcode(kum.properties.districtPcode, kum.properties.pcode);
  console.log('union key', key);
  console.log('unions', geoUni.features.filter((f) => f.properties.upazilaPcode === key).length);
}
