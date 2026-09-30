# Backend environment (`apps/api`)

Save as **`apps/api/.env.local`** (local) or paste into **Vercel → Environment Variables** (API project, Root Directory `apps/api`).

Do not commit real secrets. Run `npm run api:migrate` against Neon before first production deploy.

**Production pair:** API `https://lashkoi-api.vercel.app` ↔ web [https://lash-koi.vercel.app](https://lash-koi.vercel.app/) — frontend env: [env_front.md](./env_front.md).

### Git

| Path | In git? |
|------|---------|
| [`apps/api/.env.example`](../apps/api/.env.example) | **Yes** — placeholders only |
| `apps/api/.env.local` | **No** — [`.gitignore`](../.gitignore) (`*.local` + explicit path) |
| Any `.env` under `apps/api/` | **No** |

Copy example → `.env.local`, fill values locally. Production secrets live in **Vercel**, not the repo.

If the map shows **“Some data could not load”**, the browser is not reaching **this** API: another app may be using the same `PORT` (e.g. a different Nest project on `:3001`). Set a free port in `PORT`, match `VITE_API_BASE_URL` in `apps/web/.env`, restart both dev servers, and verify `http://localhost:<PORT>/api/v1/incident-types?lang=en` returns JSON (not 404).

---

## Copy — local (`apps/api/.env.local`)

```env
NODE_ENV=development
PORT=3000
DATABASE_LOGGING=false

DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require

JWT_SECRET=replace-with-at-least-32-random-characters-here
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PUBLIC_SITE_URL=http://localhost:5173
SITEMAP_BASE_URL=http://localhost:5173

SWAGGER_ENABLED=true

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-dev-password-min-8-chars

DISTRICTS_GEOJSON=
GOVERNANCE_PARTNER_KEY=

ADMIN_POINTS_GEOJSON=E:\election_file_2026\bgd_adminpoints.geojson
```

---

## Copy — Vercel production (API project `lashkoi-api`)

Paste in **Vercel → lashkoi-api → Settings → Environment Variables** (Root Directory `apps/api`). Replace `DATABASE_URL`, `JWT_SECRET`, and Upstash values with yours.

```env
NODE_ENV=production

DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require

JWT_SECRET=replace-with-at-least-32-random-characters-here
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

CORS_ORIGINS=https://lash-koi.vercel.app
PUBLIC_SITE_URL=https://lash-koi.vercel.app
SITEMAP_BASE_URL=https://lash-koi.vercel.app

SWAGGER_ENABLED=true

GOVERNANCE_PARTNER_KEY=
```

`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_POINTS_GEOJSON` are for **local/CI seeds only** — not needed on Vercel runtime.

---

## Copy — Vercel + BDCP browser partner (add to `CORS_ORIGINS`)

```env
CORS_ORIGINS=https://lash-koi.vercel.app,https://bdcp.vercel.app,https://bdvote2026.vercel.app
```

---

## Variable reference

### Runtime (API server)

| Variable | Required | Default |
|----------|----------|---------|
| `NODE_ENV` | No | `development` |
| `PORT` | No | `3000` (local only) |
| `DATABASE_URL` | **Yes** | — |
| `JWT_SECRET` | **Yes** | min 32 chars |
| `JWT_ACCESS_TTL` | No | `15m` |
| `JWT_REFRESH_TTL` | No | `7d` |
| `CORS_ORIGINS` | No | `http://localhost:5173` |
| `PUBLIC_SITE_URL` | No | `http://localhost:5173` |
| `SITEMAP_BASE_URL` | No | same as `PUBLIC_SITE_URL` |
| `SWAGGER_ENABLED` | No | `true` |

### Optional

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Redis cache (else in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with URL |
| `DATABASE_LOGGING` | `true` = log all SQL |
| `DISTRICTS_GEOJSON` | D8 district polygon file path |
| `GOVERNANCE_PARTNER_KEY` | Locks `/governance/tracker` behind `X-Partner-Key` |

### Seeds / CLI only

| Variable | Purpose |
|----------|---------|
| `ADMIN_EMAIL` | `npm run api:seed` |
| `ADMIN_PASSWORD` | `npm run api:seed` |
| `ADMIN_POINTS_GEOJSON` | `npm run api:seed:areas` |

Deploy: [DEPLOY.md](./DEPLOY.md) · Frontend env: [env_front.md](./env_front.md)
