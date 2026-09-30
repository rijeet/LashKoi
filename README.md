# LashKoi

Public incident map for Bangladesh (extortion, measles, kidnap, dengue). Admin-published data; public read-only map.

## Status

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Decisions, env templates, seed config, splash prototype | Done — [docs/PHASE0_SIGNOFF.md](docs/PHASE0_SIGNOFF.md) |
| **1** | `apps/api` NestJS + Neon PostGIS | Scaffolded — [apps/api/README.md](apps/api/README.md) |
| **2** | `apps/web` map + loading splash | Ready for sign-off — [docs/PHASE2_SIGNOFF.md](docs/PHASE2_SIGNOFF.md) |

Full specification: [.cursor/plans/incident_map_platform_f261af94.plan.md](.cursor/plans/incident_map_platform_f261af94.plan.md)

## Phase 1 API quick start

```bash
npm install
copy apps\api\.env.example apps\api\.env.local   # fill DATABASE_URL, JWT_SECRET
npm run api:migrate
npm run api:seed
npm run api:seed:areas
npm run api:seed:demo
npm run api:dev
```

Swagger: http://localhost:3000/swagger

## Phase 2 web quick start

```bash
copy apps\web\.env.example apps\web\.env
npm run api:dev    # :3000
npm run web:dev    # :5173
npm run phase2:smoke   # API must be running
```

Phase 2 checklist: [docs/PHASE2_SIGNOFF.md](docs/PHASE2_SIGNOFF.md)

## Local news harvest → bulk import (drafts)

Full guide: **[docs/bulk_import_harvest.md](docs/bulk_import_harvest.md)** — JSON bulk, admin UI, harvest CLI, Ollama translate, troubleshooting.

Quick: [`tools/incident-harvest`](tools/incident-harvest/README.md), `npm run harvest:env`, `npm run api:migrate`, then `npm run harvest:import:yes -- config/bulk-incidents.example.json`.

Clear splash: `sessionStorage.removeItem('lk_splash_seen')` in browser devtools.

## Phase 0 quick start

1. Read [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/SETUP_NEON_UPSTASH.md](docs/SETUP_NEON_UPSTASH.md).
2. Copy `apps/api/.env.example` → `apps/api/.env.local` and `apps/web/.env.example` → `apps/web/.env`.
3. Open [reference/prototypes/loading-splash.html](reference/prototypes/loading-splash.html) in a browser (MVP loading UX prototype).
4. Run `npm run phase0:check` from this folder.

## Reference assets (not app runtime)

Offline geo sources, Wikipedia HTML dumps, and HTML prototypes live under [`reference/`](reference/README.md). Generated map data is in `apps/web/public/geo/`.

## Production deploy

**Frontend (Vercel)** + **backend (Railway/Render/etc.)** — step-by-step env, `vercel.json`, and CORS: [docs/DEPLOY.md](docs/DEPLOY.md).
