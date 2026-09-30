# LashKoi API (`apps/api`)

NestJS backend (scol-style layers): PostGIS, JWT + refresh rotation, public incident/boundary APIs, admin auth + incident CRUD.

## Setup

1. Copy `.env.example` → `.env.local` and fill `DATABASE_URL`, `JWT_SECRET`, optional Upstash.
2. From repo root: `npm install`
3. From repo root: `npm run api:migrate` (uses hoisted `typeorm-ts-node-commonjs`; do not use `apps/api/node_modules/typeorm/cli.js`)
4. `npm run seed --workspace=@lashkoi/api`
5. `npm run seed:areas --workspace=@lashkoi/api` (requires election `bgd_adminpoints.geojson` or set `ADMIN_POINTS_GEOJSON`)
6. `npm run api:seed:demo` from repo root — 4 published demo markers for the public map
7. `npm run start:dev --workspace=@lashkoi/api` → http://localhost:3000/swagger

## Scripts

| Script | Purpose |
|--------|---------|
| `typeorm:run` | Apply migrations |
| `seed` | Incident types + admin user |
| `seed:areas` | `admin_areas` from OCHA admin points + BN names |
| `seed:demo` | Published demo incidents (`config/demo-incidents.seed.json`) |
| `test` | Unit tests (slug, media, token digest) |

## API

- Base: `/api/v1`
- Swagger: `/swagger`
- Health (raw): `/health`

## Production deploy (Vercel)

**Root Directory:** `apps/api` — [`vercel.json`](vercel.json) + serverless entry [`api/index.ts`](api/index.ts).

Pair with a second Vercel project for `apps/web`. Full env and URLs: [../../docs/DEPLOY.md](../../docs/DEPLOY.md).

Railway/Render (long-running) is still supported via `npm run start:prod`.
