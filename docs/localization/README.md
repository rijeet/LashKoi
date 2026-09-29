# Bengali area names (manual fill-in)

Election GeoJSON often has **no** `nameBn` for upazila/union. You fill Bengali here; we merge into the map.

## Files (English templates)

| File | Rows | Fill column |
|------|------|-------------|
| `divisions-en-template.csv` | 8 | `nameBn` |
| `districts-en-template.csv` | 64 | `nameBn` |
| `upazilas-en-template.csv` | ~507 | `nameBn` |
| `unions-en-template.csv` | ~5160 | `nameBn` |

Regenerate templates after `npm run web:geo`:

```bash
node scripts/export-bn-templates.mjs
```

## Wikipedia import (upazila + union BN)

Save these pages from bn.wikipedia (browser “Save page”) under **`reference/geo/`**:

- `reference/geo/বাংলাদেশের উপজেলার তালিকা - উইকিপিডিয়া.html`
- `reference/geo/বাংলাদেশের ইউনিয়নের তালিকা - উইকিপিডিয়া.html`

Then run (after `web:geo`):

```bash
npm run web:geo:bn
```

This updates `apps/web/public/geo/bd-upazilas.json`, `bd-union-points.json`, and `bn-by-pcode.json`. See `wikipedia-import-report.json` for match stats.

## Your workflow

1. Open a CSV in Excel or Google Sheets.
2. Keep `pcode` unchanged (used to match on the map).
3. Type Bengali in **`nameBn`** only.
4. Save as UTF-8 CSV (same filename with `-filled` suffix is fine).
5. Send back or place as `upazilas-bn-filled.csv` etc. — we import to `apps/web/public/geo/bn-by-pcode.json`.

## Example row

```csv
pcode,districtPcode,nameEn,nameBn
BD20030004,BD2003,Alikadam,আলীকদম
```

Do **not** change `nameEn` or `pcode` unless fixing a typo in the source data.
