/**
 * Export English CSV templates for manual Bengali fill-in.
 * Usage: node scripts/export-bn-templates.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const outDir = path.join(ROOT, 'docs', 'localization');

function csvRow(cols) {
  return cols
    .map((c) => {
      const s = String(c ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',');
}

fs.mkdirSync(outDir, { recursive: true });

const upa = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/web/public/geo/bd-upazilas.json'), 'utf8'),
);
const uni = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/web/public/geo/bd-union-points.json'), 'utf8'),
);

const upaLines = ['pcode,districtPcode,nameEn,nameBn'];
for (const f of upa.features) {
  const p = f.properties;
  upaLines.push(csvRow([p.pcode, p.districtPcode, p.nameEn, '']));
}
fs.writeFileSync(path.join(outDir, 'upazilas-en-template.csv'), upaLines.join('\n'), 'utf8');

const uniLines = ['pcode,districtPcode,upazilaPcode,nameEn,nameBn'];
for (const f of uni.features) {
  const p = f.properties;
  uniLines.push(csvRow([p.pcode, p.districtPcode, p.upazilaPcode, p.nameEn, '']));
}
fs.writeFileSync(path.join(outDir, 'unions-en-template.csv'), uniLines.join('\n'), 'utf8');

// Divisions + districts (small — quick win for map header)
const div = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/web/public/geo/bd-divisions.json'), 'utf8'),
);
const dist = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/web/public/geo/bd-districts.json'), 'utf8'),
);

const divLines = ['pcode,nameEn,nameBn'];
for (const f of div.features) {
  const p = f.properties;
  divLines.push(csvRow([p.pcode, p.nameEn, '']));
}
fs.writeFileSync(path.join(outDir, 'divisions-en-template.csv'), divLines.join('\n'), 'utf8');

const distLines = ['pcode,divisionPcode,nameEn,nameBn'];
for (const f of dist.features) {
  const p = f.properties;
  distLines.push(csvRow([p.pcode, p.divisionPcode, p.nameEn, '']));
}
fs.writeFileSync(path.join(outDir, 'districts-en-template.csv'), distLines.join('\n'), 'utf8');

console.log('Wrote docs/localization/*.csv');
console.log('  divisions:', div.features.length);
console.log('  districts:', dist.features.length);
console.log('  upazilas:', upa.features.length);
console.log('  unions:', uni.features.length);
