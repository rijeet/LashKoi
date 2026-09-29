# Reference & source assets (not app runtime)

One-off inputs for geo scripts and design prototypes. **App code** lives under `apps/`, `config/`, `scripts/`, `docs/`.

| Folder | Contents |
|--------|----------|
| `geo/` | Wikipedia HTML dumps, `bangladesh-geojson/`, BN import templates |
| `prototypes/` | Legacy HTML map/splash mockups, `serve-map.ps1` |
| `maps/` | Large SVG/MBTiles/DCC archives (often gitignored — keep locally) |
| `brand/brand/` | Early logo SVGs (app uses `apps/web/public/logo.svg`) |

## Scripts

| Script | Inputs in `reference/geo/` |
|--------|----------------------------|
| `npm run web:geo:bn` | `বাংলাদেশের উপজেলার তালিকা - উইকিপিডিয়া.html`, union list HTML |
| `npm run web:geo` | `bangladesh-geojson/src/data/*` |

DNCC ward labels for the Dhaka modal: edit `apps/web/public/geo/dhaka-dncc-wards.json` directly (no source TXT).
