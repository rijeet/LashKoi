# LashKoi Web (`apps/web`)

React 19 + Vite + Tailwind 4 + React Router 7 + TanStack Query + Leaflet.

## Setup

```bash
# from repo root
copy apps\web\.env.example apps\web\.env
npm install
npm run api:dev    # terminal 1 — http://localhost:3000
npm run web:dev    # terminal 2 — http://localhost:5173
```

`VITE_API_BASE_URL` must match the API (`http://localhost:3000/api/v1`, or whatever `PORT` is in `apps/api/.env.local`). API `CORS_ORIGINS` must include `http://localhost:5173`.

Generate map GeoJSON (from election boundaries on your machine):

```bash
npm run web:geo
```

Outputs `public/geo/bd-divisions.json` and `bd-districts.json`.

## Phase 2 deliverables in this app

- **SplashGate** + **CssLoadingSplash** + **BloodFlowTransition** (D7 prefetch handshake)
- **api-client** + resource services + query keys
- **MapPage** — division/district GeoJSON layers, Lucide markers, filters in URL, overlay + quick list, EN/BN
- **IncidentSeoPage** — article + react-helmet-async (OG, canonical, JSON-LD)
- **geo-names** + zoom-scaled division/district labels on the map
- **Deploy** — `vercel.json` (sitemap/robots API proxy, incident meta-injection), Vite dev proxy for `/sitemap.xml` & `/robots.txt`
- Lazy **MapView** chunk + `manualChunks` for Leaflet
- **Phase 3 admin** — login, session refresh, incident list/create/edit/publish, geo cascade + map picker, media URLs

### Production (Vercel)

**Root Directory:** `apps/web` (uses [`vercel.json`](vercel.json)).

Full split deploy (API host + env matrix): [../../docs/DEPLOY.md](../../docs/DEPLOY.md).

Environment on Vercel:

- `LASHKOI_API_BASE_URL` — runtime (serverless sitemap + SEO injection)
- `VITE_API_BASE_URL` — build-time browser API base (same URL, include `/api/v1`)
- `VITE_SITE_URL` — canonical web origin

Crawlers on `/:lang/incidents/:slug` get `index.html` with meta from `GET /seo/incidents/:slug` on the API.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server :5173 |
| `npm run build` | Production build |
