# Phase 2 — sign-off checklist

Public web (`apps/web`) against live **Neon + API**.

## One-time stack setup

```bash
npm install
npm run phase0:check
npm run api:migrate
npm run api:seed
npm run api:seed:areas    # requires election admin points GeoJSON (see apps/api/.env.local)
npm run api:seed:demo     # published demo markers (optional if you use admin/Swagger)
npm run web:geo           # static bd-*.json under apps/web/public/geo
npm run web:geo:dhaka-unions   # optional — Dhaka modal ADM4
```

## Run locally

| Terminal | Command | URL |
|----------|---------|-----|
| API | `npm run api:dev` | http://localhost:3000/swagger |
| Web | `npm run web:dev` | http://localhost:5173 |

Env:

- `apps/api/.env.local` — `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` includes `http://localhost:5173`
- `apps/web/.env` — `VITE_API_BASE_URL=http://localhost:3000/api/v1`

## Automated smoke

With API running:

```bash
npm run phase2:smoke
```

## Manual acceptance (plan section Phase 2)

- [ ] Splash → prefetch → **Enter map** / auto-enter → blood-flow → map
- [ ] Type filter (e.g. Dengue) updates markers
- [ ] Division / district filter zooms map
- [ ] Click marker → overlay (image / YouTube tab if seeded)
- [ ] EN / BN toggle on header
- [ ] `/{lang}/incidents/{slug}` article page + meta (local: react-helmet; prod: Vercel injection)
- [ ] Dhaka district hover (zoom ≥ 8) → city modal; union hover shows ward when matched
- [ ] `/sitemap.xml` and `/robots.txt` via Vite proxy (dev) or Vercel rewrites (prod)

## Geo scripts (repo root)

| Script | Output |
|--------|--------|
| `npm run web:geo` | `bd-divisions`, `bd-districts`, upazilas, union points |
| `npm run web:geo:bn` | Bangla names on geo JSON |
| `npm run web:geo:dhaka-unions` | `bd-dhaka-union-polygons.json` |

DNCC ward tooltips: maintain `apps/web/public/geo/dhaka-dncc-wards.json` by hand (no TXT import).

## Next

**Phase 3** — admin publish hardening, point-in-district validation, banners UI.
