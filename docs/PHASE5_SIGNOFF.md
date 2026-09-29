# Phase 5 — scale & partners

## In repo

- **Marker clustering** — `leaflet.markercluster` when ≥ 8 markers.
- **Storyteller** — Wall-clock progress bar per slide.
- **`pg_trgm` search** — GIN indexes + public/admin `q` filters.
- **Audit log** — `incident_audit` + admin history UI.
- **Partner API** — `GET /api/v1/governance/tracker` (+ optional `X-Partner-Key`). **BDCP + CORS:** see [BDCP_PARTNER_API.md](./BDCP_PARTNER_API.md).
- **Health choropleth** — `GET /stats/health-districts`; map shades districts when type filter is **dengue** or **measles** (case sum, default 30 days).
- **Analytics dashboard** — `GET /admin/analytics` + `/admin/analytics` UI (by type, division, daily bars, top health districts).

## Verify

```bash
curl.exe "http://localhost:3000/api/v1/stats/health-districts?type=dengue&lang=en"
# Admin analytics (Bearer access token)
curl.exe -H "Authorization: Bearer <access>" "http://localhost:3000/api/v1/admin/analytics?days=30"
```

On the public map: choose **Dengue** or **Measles** in the type filter — district fill and legend appear.

## Not yet

- Bbox-based incident loading on pan/zoom
- Visitor analytics (Plausible/Umami) — out of scope for app code
