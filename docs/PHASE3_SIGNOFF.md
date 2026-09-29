# Phase 3 — admin sign-off

## Backend (done in this pass)

- **D8** — `DistrictBoundaryValidationService`: map point must fall inside selected district polygon (`bd-districts.json` + PostGIS `ST_Contains`) on create, patch (when location changes), and publish.
- **P-code chain** — division → district → upazila → union validation on save.
- **Publish / unpublish / soft-delete** — `POST …/unpublish`, `DELETE …/id`; clears in-memory boundary cache on publish lifecycle changes.
- **Admin banners** — `GET/POST/PATCH/DELETE /api/v1/admin/banners`.
- **Login lockout** — already in `LoginService` (10 failures → 15 min lock).

## Frontend

- Incident edit: **Publish**, **Unpublish**, **Delete**.
- **`/admin/banners`** — list, create, enable/disable, delete.

## Verify

1. `npm run web:geo` (district polygons for API).
2. `npm run api:dev` + `npm run web:dev`.
3. Admin → new incident: pick **Dhaka** district, place pin **inside** district → publish OK; pin outside → `LOCATION_OUTSIDE_DISTRICT`.
4. Admin → **Banners** → add image URL → appears in splash prefetch (`/featured-banners`).
5. Unpublish → marker disappears from public map after refresh.

## Still optional (later)

- Rich HTML editor + slug preview in form.
- Upstash key purge (beyond in-memory boundary cache).
- Rate limit by IP (lockout is per-user today).
