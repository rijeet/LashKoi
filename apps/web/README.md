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

`VITE_API_BASE_URL` must match the API (`http://localhost:3000/api/v1`). API `CORS_ORIGINS` must include `http://localhost:5173`.

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

Set root directory to `apps/web`. Environment:

- `LASHKOI_API_BASE_URL` — public API base (e.g. `https://api.lashkoi.com/api/v1`)
- `VITE_API_BASE_URL` — same value at build time for the browser
- `VITE_SITE_URL` — canonical web origin (e.g. `https://lashkoi.com`)

Crawlers hitting `/:lang/incidents/:slug` receive `index.html` with injected meta from `GET /seo/incidents/:slug`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server :5173 |
| `npm run build` | Production build |
