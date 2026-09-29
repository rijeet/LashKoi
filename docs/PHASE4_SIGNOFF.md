# Phase 4 — storyteller & banners (MVP)

## Delivered

- **Storyteller** — Auto-advances every **5s** (configurable via `STORYTELLER_INTERVAL_MS`), newest-first per calendar day (Asia/Dhaka), up to **30 days** via `/incidents/days` + `/incidents?date=`.
- **Header** — Play / pause tour + thin progress bar.
- **User pause** — Clicking a marker or quick-list item stops the tour.
- **Breaking strip** — First active `breaking` banner from `/featured-banners` under the header.
- **API** — `date` filter on public GeoJSON list.

## Try it

1. `api:dev` + `web:dev`, open map after splash.
2. Tour starts automatically; watch overlay + map fly every 5s.
3. **Pause tour** in header; click a marker to inspect one incident.
4. Admin → **Banners** → add `breaking` banner → refresh map.

## Later

- Progress timer synced to slide interval wall clock (currently step-based).
- Global banner carousel / multiple breaking lines.
