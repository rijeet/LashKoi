/**
 * Parse saved bn.wikipedia HTML lists → bn-by-pcode.json + patch geo nameBn.
 *
 * Usage: node scripts/import-wikipedia-bn.mjs
 */
import fs from 'fs';
import path from 'path';
import Sanscript from '@indic-transliteration/sanscript';

import { ROOT, REF_GEO } from './paths.mjs';

const UPA_HTML = path.join(REF_GEO, 'বাংলাদেশের উপজেলার তালিকা - উইকিপিডিয়া.html');
const UNI_HTML = path.join(REF_GEO, 'বাংলাদেশের ইউনিয়নের তালিকা - উইকিপিডিয়া.html');
const GEO_UPA = path.join(ROOT, 'apps/web/public/geo/bd-upazilas.json');
const GEO_UNI = path.join(ROOT, 'apps/web/public/geo/bd-union-points.json');
const GEO_DIST = path.join(ROOT, 'apps/web/public/geo/bd-districts.json');
const OUT = path.join(ROOT, 'apps/web/public/geo/bn-by-pcode.json');
const BN_DATA = path.join(REF_GEO, 'bangladesh-geojson', 'src', 'data');

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function normBn(s) {
  const base = stripTags(s).split(/[,،]/)[0];
  return base
    .replace(/\s*উপজেলা\s*$/u, '')
    .replace(/\s*ইউনিয়ন\s*$/u, '')
    .replace(/\s*জেলা\s*$/u, '')
    .replace(/\s*পৌরসভা\s*$/u, '')
    .trim();
}

function foldBn(s) {
  return normBn(s)
    .normalize('NFC')
    .replace(/\u09DF/g, '\u09BF\u09AF') // য় → িয়
    .replace(/\u200C|\u200D/g, '');
}

function normKey(s) {
  return foldBn(s)
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ');
}

function normEnKey(s) {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(sadar|paurashava|pourashava)$/g, '');
}

function romanKeyFromBn(bn) {
  try {
    const it = Sanscript.t(foldBn(bn), 'bengali', 'itrans');
    return it
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/aa/g, 'a')
      .replace(/(pur|para|nagar|gram|khali|hati|char|bazar)$/g, '');
  } catch {
    return '';
  }
}

function similarityEnBn(nameEn, nameBn) {
  const a = normEnKey(nameEn);
  const b = romanKeyFromBn(nameBn);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.92;
  const minLen = Math.min(a.length, b.length);
  let same = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) same++;
  }
  return same / Math.max(a.length, b.length);
}

function contentHtml(html) {
  const idx = html.indexOf('id="mw-content-text"');
  return idx >= 0 ? html.slice(idx) : html;
}

function districtBnFromSection(sectionHtml, level) {
  const idRe = new RegExp(`<h${level}[^>]*id="([^"]+)"`, 'i');
  const m = sectionHtml.match(idRe);
  if (!m) return null;
  const fromId = m[1].replace(/_/g, ' ');
  if (!fromId.includes('জেলা')) return null;
  return normBn(fromId);
}

/** District BN → election district pcode */
function buildDistrictBnToPcode() {
  const dist = JSON.parse(fs.readFileSync(GEO_DIST, 'utf8'));
  const distJson = JSON.parse(fs.readFileSync(path.join(BN_DATA, 'bd-districts.json'), 'utf8'));
  const electionNameToPcode = new Map();
  for (const f of dist.features) {
    electionNameToPcode.set(f.properties.nameEn.toLowerCase(), f.properties.pcode);
  }
  const map = new Map();
  for (const f of dist.features) {
    const p = f.properties;
    if (p.nameBn) map.set(normKey(p.nameBn), p.pcode);
    if (p.nameEn) map.set(normKey(p.nameEn), p.pcode);
  }
  for (const d of distJson.districts ?? []) {
    const pcode = electionNameToPcode.get(d.name.toLowerCase());
    if (!pcode) continue;
    if (d.bn_name) map.set(normKey(d.bn_name), pcode);
    const rk = romanKeyFromBn(d.bn_name);
    if (rk) map.set(`roman:${rk}`, pcode);
  }
  return map;
}

function resolveDistrictPcode(districtBn, distBnToPcode) {
  const k = normKey(districtBn);
  if (distBnToPcode.has(k)) return distBnToPcode.get(k);
  const rk = romanKeyFromBn(districtBn);
  if (rk && distBnToPcode.has(`roman:${rk}`)) return distBnToPcode.get(`roman:${rk}`);
  return null;
}

/** bangladesh-geojson: (district pcode, upazila bn) → nameEn */
function buildBgUpazilaBridge() {
  const distJson = JSON.parse(fs.readFileSync(path.join(BN_DATA, 'bd-districts.json'), 'utf8'));
  const upaJson = JSON.parse(fs.readFileSync(path.join(BN_DATA, 'bd-upazilas.json'), 'utf8'));
  const distById = new Map((distJson.districts ?? []).map((d) => [d.id, d]));
  const electionDist = JSON.parse(fs.readFileSync(GEO_DIST, 'utf8'));
  const electionNameToPcode = new Map();
  for (const f of electionDist.features) {
    electionNameToPcode.set(f.properties.nameEn.toLowerCase(), f.properties.pcode);
  }

  const districtIdToPcode = new Map();
  for (const d of distJson.districts ?? []) {
    const pcode = electionNameToPcode.get(d.name.toLowerCase());
    if (pcode) districtIdToPcode.set(d.id, pcode);
  }

  const bridge = new Map();
  for (const u of upaJson.upazilas ?? []) {
    const d = distById.get(u.district_id);
    const districtPcode = districtIdToPcode.get(u.district_id);
    if (!districtPcode || !u.bn_name) continue;
    bridge.set(`${districtPcode}|${normKey(u.bn_name)}`, u.name);
    if (d?.bn_name) {
      bridge.set(`${normKey(d.bn_name)}|${normKey(u.bn_name)}`, u.name);
    }
  }
  return bridge;
}

function parseUpazilaPage(html) {
  const content = contentHtml(html);
  const rows = [];
  const sectionRe = /<h4[^>]*id="([^"]+)"[^>]*>[\s\S]*?(?=<h4[^>]*id=|<h2[^>]*id=|$)/gi;
  let sec;
  while ((sec = sectionRe.exec(content))) {
    const chunk = sec[0];
    const districtBn = districtBnFromSection(chunk, 4);
    if (!districtBn) continue;
    const ulEnd = chunk.indexOf('</ul>');
    const ulStart = chunk.indexOf('<ul');
    if (ulStart < 0 || ulEnd < 0) continue;
    const ul = chunk.slice(ulStart, ulEnd);
    const linkRe = /<a[^>]*title="([^"]+)"[^>]*>/gi;
    let m;
    while ((m = linkRe.exec(ul))) {
      const nameBn = normBn(m[1]);
      if (nameBn && !nameBn.includes('সম্পাদনা')) rows.push({ districtBn, nameBn });
    }
  }
  return rows;
}

function extractUnionLinks(cellHtml) {
  const names = [];
  const linkRe = /<a[^>]*title="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(cellHtml))) {
    const nameBn = normBn(m[1]);
    if (nameBn && nameBn.length > 1 && !/উপজেলা|জেলা|বিভাগ/u.test(nameBn)) {
      names.push(nameBn);
    }
  }
  if (!names.length) {
    for (const part of stripTags(cellHtml).split(/[,،]/)) {
      const nameBn = normBn(part);
      if (nameBn) names.push(nameBn);
    }
  }
  return names;
}

function parseUnionPage(html) {
  const content = contentHtml(html);
  const rows = [];
  const sectionRe = /<h3[^>]*id="([^"]+)"[^>]*>[\s\S]*?(?=<h3[^>]*id=|$)/gi;
  let sec;
  while ((sec = sectionRe.exec(content))) {
    const chunk = sec[0];
    const districtBn = districtBnFromSection(chunk, 3);
    if (!districtBn) continue;
    const tableStart = chunk.indexOf('<table class="wikitable"');
    if (tableStart < 0) continue;
    const tableEnd = chunk.indexOf('</table>', tableStart);
    const table = chunk.slice(tableStart, tableEnd);
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let row;
    while ((row = rowRe.exec(table))) {
      const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1]);
      if (cells.length < 2) continue;
      const upazilaBn = normBn(cells[0]);
      if (!upazilaBn || upazilaBn === 'উপজেলা') continue;
      const unions = extractUnionLinks(cells[1]);
      for (const unionBn of unions) {
        rows.push({ districtBn, upazilaBn, nameBn: unionBn });
      }
    }
  }
  return rows;
}

function buildUnionUpazilaKeysByDistrict(uniFeatures) {
  const byDistrict = new Map();
  for (const f of uniFeatures) {
    const d = f.properties.districtPcode;
    if (!byDistrict.has(d)) byDistrict.set(d, new Set());
    byDistrict.get(d).add(f.properties.upazilaPcode);
  }
  return byDistrict;
}

function unionUpazilaPcode(districtPcode, fullUpazilaPcode, keysForDistrict) {
  const suffix = fullUpazilaPcode.slice(districtPcode.length);
  const tail = suffix.replace(/^0+/, '') || '0';
  for (const u of keysForDistrict ?? []) {
    if (u.endsWith(tail)) return u;
  }
  return districtPcode + tail.padStart(3, '0');
}

function findUpazilaFeature(features, districtPcode, nameEn) {
  const key = nameEn.toLowerCase();
  let f = features.find(
    (x) =>
      x.properties.districtPcode === districtPcode &&
      x.properties.nameEn.toLowerCase() === key,
  );
  if (f) return f;
  return features.find(
    (x) =>
      x.properties.districtPcode === districtPcode &&
      normEnKey(x.properties.nameEn) === normEnKey(nameEn),
  );
}

function matchUpazilas(wikiRows, geo, distBnToPcode, bgBridge) {
  const byPcode = {};
  const unmatched = [];
  const features = geo.features.map((f) => ({ ...f, properties: { ...f.properties } }));

  for (const row of wikiRows) {
    const dPcode = resolveDistrictPcode(row.districtBn, distBnToPcode);
    if (!dPcode) {
      unmatched.push({ reason: 'district', ...row });
      continue;
    }
    let nameEn =
      bgBridge.get(`${dPcode}|${normKey(row.nameBn)}`) ??
      bgBridge.get(`${normKey(row.districtBn)}|${normKey(row.nameBn)}`);

    let feature = nameEn ? findUpazilaFeature(features, dPcode, nameEn) : null;

    if (!feature) {
      const candidates = features.filter((f) => f.properties.districtPcode === dPcode);
      let best = null;
      let bestScore = 0.55;
      for (const c of candidates) {
        const score = similarityEnBn(c.properties.nameEn, row.nameBn);
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
      feature = best;
    }

    if (feature) {
      feature.properties.nameBn = row.nameBn;
      byPcode[feature.properties.pcode] = row.nameBn;
    } else {
      unmatched.push({ reason: 'upazila', districtPcode: dPcode, ...row });
    }
  }
  return { features, byPcode, unmatched };
}

function matchUnions(wikiRows, geo, distBnToPcode, bgBridge, upaFeatures) {
  const byPcode = {};
  const unmatched = [];
  const features = geo.features.map((f) => ({ ...f, properties: { ...f.properties } }));
  const unionKeysByDistrict = buildUnionUpazilaKeysByDistrict(features);

  const wikiByUpazila = new Map();
  for (const row of wikiRows) {
    const dPcode = resolveDistrictPcode(row.districtBn, distBnToPcode);
    if (!dPcode) continue;
    let nameEn =
      bgBridge.get(`${dPcode}|${normKey(row.upazilaBn)}`) ??
      bgBridge.get(`${normKey(row.districtBn)}|${normKey(row.upazilaBn)}`);
    let upa = nameEn ? findUpazilaFeature(upaFeatures, dPcode, nameEn) : null;
    if (!upa) {
      const candidates = upaFeatures.filter((f) => f.properties.districtPcode === dPcode);
      let best = null;
      let bestScore = 0.55;
      for (const c of candidates) {
        const score = similarityEnBn(c.properties.nameEn, row.upazilaBn);
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
      upa = best;
    }
    if (!upa) continue;
    const keys = unionKeysByDistrict.get(dPcode) ?? new Set();
    const upaKey = unionUpazilaPcode(dPcode, upa.properties.pcode, keys);
    if (!wikiByUpazila.has(upaKey)) wikiByUpazila.set(upaKey, []);
    wikiByUpazila.get(upaKey).push(row.nameBn);
  }

  for (const [upaKey, bnList] of wikiByUpazila) {
    const geoUnions = features.filter((f) => f.properties.upazilaPcode === upaKey);
    const used = new Set();
    for (const nameBn of bnList) {
      let best = null;
      let bestScore = 0.42;
      for (const g of geoUnions) {
        if (used.has(g.properties.pcode)) continue;
        const score = similarityEnBn(g.properties.nameEn, nameBn);
        if (score > bestScore) {
          bestScore = score;
          best = g;
        }
      }
      if (best) {
        used.add(best.properties.pcode);
        best.properties.nameBn = nameBn;
        byPcode[best.properties.pcode] = nameBn;
      } else {
        unmatched.push({ reason: 'union', upazilaPcode: upaKey, nameBn });
      }
    }
  }

  return { features, byPcode, unmatched };
}

function fillUpazilaBnFromBgDataset(features, byPcode) {
  const upaJson = JSON.parse(fs.readFileSync(path.join(BN_DATA, 'bd-upazilas.json'), 'utf8'));
  const distJson = JSON.parse(fs.readFileSync(path.join(BN_DATA, 'bd-districts.json'), 'utf8'));
  const electionDist = JSON.parse(fs.readFileSync(GEO_DIST, 'utf8'));
  const electionNameToPcode = new Map();
  for (const f of electionDist.features) {
    electionNameToPcode.set(f.properties.nameEn.toLowerCase(), f.properties.pcode);
  }
  const districtIdToPcode = new Map();
  for (const d of distJson.districts ?? []) {
    const pcode = electionNameToPcode.get(d.name.toLowerCase());
    if (pcode) districtIdToPcode.set(d.id, pcode);
  }
  const enToBn = new Map();
  for (const u of upaJson.upazilas ?? []) {
    const dPcode = districtIdToPcode.get(u.district_id);
    if (!dPcode || !u.bn_name) continue;
    enToBn.set(`${dPcode}|${u.name.toLowerCase()}`, u.bn_name);
  }
  for (const f of features) {
    const p = f.properties;
    if (p.nameBn) continue;
    const bn = enToBn.get(`${p.districtPcode}|${p.nameEn.toLowerCase()}`);
    if (bn) {
      p.nameBn = bn;
      byPcode[p.pcode] = bn;
    }
  }
}

function main() {
  if (!fs.existsSync(UPA_HTML) || !fs.existsSync(UNI_HTML)) {
    console.error('Missing Wikipedia HTML files in repo root');
    process.exit(1);
  }

  const distBnToPcode = buildDistrictBnToPcode();
  const bgBridge = buildBgUpazilaBridge();
  const upaHtml = fs.readFileSync(UPA_HTML, 'utf8');
  const uniHtml = fs.readFileSync(UNI_HTML, 'utf8');

  const wikiUpa = parseUpazilaPage(upaHtml);
  const wikiUni = parseUnionPage(uniHtml);
  console.log('Parsed wiki rows — upazila:', wikiUpa.length, 'union:', wikiUni.length);

  const geoUpa = JSON.parse(fs.readFileSync(GEO_UPA, 'utf8'));
  const geoUni = JSON.parse(fs.readFileSync(GEO_UNI, 'utf8'));

  const upaResult = matchUpazilas(wikiUpa, geoUpa, distBnToPcode, bgBridge);
  fillUpazilaBnFromBgDataset(upaResult.features, upaResult.byPcode);
  const uniResult = matchUnions(
    wikiUni,
    geoUni,
    distBnToPcode,
    bgBridge,
    upaResult.features,
  );

  const out = {
    upazila: upaResult.byPcode,
    union: uniResult.byPcode,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  fs.writeFileSync(
    GEO_UPA,
    JSON.stringify({ type: 'FeatureCollection', features: upaResult.features }),
  );
  fs.writeFileSync(
    GEO_UNI,
    JSON.stringify({ type: 'FeatureCollection', features: uniResult.features }),
  );

  const report = {
    matchedUpazila: Object.keys(out.upazila).length,
    matchedUnion: Object.keys(out.union).length,
    unmatchedUpazila: upaResult.unmatched.length,
    unmatchedUnion: uniResult.unmatched.length,
    sampleUnmatchedUpazila: upaResult.unmatched.slice(0, 15),
    sampleUnmatchedUnion: uniResult.unmatched.slice(0, 15),
  };
  fs.writeFileSync(
    path.join(ROOT, 'docs/localization/wikipedia-import-report.json'),
    JSON.stringify(report, null, 2),
  );

  console.log('Matched upazila:', report.matchedUpazila);
  console.log('Matched union:', report.matchedUnion);
  console.log('Wrote', OUT);
}

main();
