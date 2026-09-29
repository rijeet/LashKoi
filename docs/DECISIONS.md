# LashKoi — locked product decisions (Phase 0)

Snapshot of [plan section 3](../.cursor/plans/incident_map_platform_f261af94.plan.md). Change requirements by editing the plan and this file together.

| ID | Decision | Locked value |
|----|----------|--------------|
| D1 | Admin refresh token | `Authorization: Bearer <refresh>`; store refresh in **sessionStorage** (`lk_refresh_token`); access token **in memory only**; no httpOnly cookies |
| D2 | SEO | SPA + **edge meta-injection** on `/:lang/incidents/:slug` using `GET /api/v1/seo/incidents/:slug` |
| D3 | Incident types | `extortion`, `measles`, `kidnap`, `dengue` (see `config/incident-types.seed.json`) |
| D4 | Basemap | Self-hosted dark canvas + division/district GeoJSON (no tile API) |
| D5 | Health types | Point markers + `caseCount`; **district choropleth** when filter is dengue or measles (`GET /stats/health-districts`, last 30 days) |
| D6 | Storyteller | Auto-play first load; **5s**/incident (wall-clock progress in header); newest-first per day; 30 days back; loop to today |
| D7 | Splash | CssLoadingSplash in Phase 2; duration = API prefetch; once/session; **Skip to Map**; auto-enter **12s** after data ready |
| D7b | 3D intro | **Deferred** — plan section 16 |
| D8 | Location validation | Point must be inside selected district (server) |
| D9 | Admin users | One seeded admin; more via CLI/SQL until admin UI |

**Phase 0 sign-off date:** _fill when Neon + Upstash credentials are in local `.env`_

**Owner:** ____________________
