# Bulk import & local news harvest

How to load **draft** incidents from JSON or from the local harvest pipeline. Publishing still happens in admin (location pin, translation review, media rules).

**Related:** [env_backend.md](./env_backend.md) · [tools/incident-harvest/README.md](../tools/incident-harvest/README.md) · example files in [`config/`](../config/)

---

## What you need running

| Piece | Purpose |
|--------|---------|
| **API** `npm run api:dev` | `:3000` — bulk endpoints + auth |
| **Web** `npm run web:dev` | `:5173` — admin UI at `/admin/incidents/import` |
| **Neon DB** | `npm run api:migrate` (bulk tables) + `npm run api:seed` (incident types) |
| **Ollama** (optional) | `harvest:translate` only — not used by the API |

### API env (`apps/api/.env.local`)

Bulk import is **on in development** by default unless you set `ADMIN_BULK_IMPORT_ENABLED=false`.

For an explicit switch:

```env
ADMIN_BULK_IMPORT_ENABLED=true
```

**Do not enable bulk import on production Vercel** unless you accept the risk of mass draft creation behind admin auth.

District boundary checks use PostGIS + [`apps/web/public/geo/bd-districts.json`](../apps/web/public/geo/bd-districts.json). Optional override:

```env
DISTRICTS_GEOJSON=../web/public/geo/bd-districts.json
```

(Path is relative to `apps/api` when the API process starts.)

---

## Incident types (bulk `type` field)

| `type` | Notes |
|--------|--------|
| `extortion` | |
| `measles` | health |
| `kidnap` | |
| `dengue` | health |
| `body_found` | run `npm run api:seed` if missing in DB |

---

## Path A — Static JSON (fastest)

### 1. Shape your file

Top-level `{ "incidents": [ ... ] }` or a JSON array. Minimal row (Bangla-only is OK):

```json
{
  "type": "dengue",
  "titleBn": "ফরিদপুর জেলায় ডেঙ্গু আক্রান্ত বৃদ্ধি",
  "summaryBn": "হাসপাতালে ভর্তি বাড়ছে।",
  "placeNameBn": "ফরিদপুর",
  "placeHint": "ফরিদপুর জেলায় ডেঙ্গু",
  "sourceLabel": "Prothom Alo",
  "sourceUrl": "https://www.prothomalo.com/bangladesh/qs0jtq2xn0",
  "occurredAt": "2026-09-29T10:00:00.000Z"
}
```

- **`sourceUrl`** must be a real URL (used for dedupe / `externalId` hash).
- **`placeNameBn` / `placeHint`** help match a district; map pin stays **unconfirmed** until an editor sets it.
- **Images (optional)** — not required to import or publish if `summaryEn` exists. To attach a banner from the article:

```json
"media": {
  "image": "https://publisher.cdn/…/photo.jpg",
  "youtube": "https://www.youtube.com/watch?v=…",
  "facebook": "https://www.facebook.com/…/videos/…"
}
```

Shorthand: `"imageUrl": "https://…"` (same as `media.image`). Harvest scrape fills `media.image` from the page `og:image` when present.
- Examples: [`config/bulk-incidents.example.json`](../config/bulk-incidents.example.json), [`config/bulk-incidents-30.json`](../config/bulk-incidents-30.json).

### 2. Import

**Admin UI:** log in → **Incidents** → **Bulk import** → upload JSON → dry-run preview → import selected rows as drafts.

**CLI:**

```bash
npm run harvest:env
npm run harvest:import:yes -- config/bulk-incidents.example.json
```

`harvest:env` copies `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/api/.env.local` into `tools/incident-harvest/.env`.

Interactive import (prompts `y/N`):

```bash
npm run harvest:import -- config/your-file.json
```

### API (for scripts)

- `POST /api/v1/admin/incidents/bulk/normalize` — preview mapping
- `POST /api/v1/admin/incidents/bulk?dryRun=true` — validate without writes
- `POST /api/v1/admin/incidents/bulk` — create drafts  
  Bearer token from `POST /api/v1/admin/auth/login`

Max **200** rows per request.

---

## Path B — Harvest from news feeds (daily)

Local pipeline: **discover** RSS/feed URLs → **scrape** HTML → **keyword classify** → **JSONL** → optional **Ollama translate** → **import**.

```bash
npm run harvest:env
npm run harvest:export-areas    # once, refreshes gazetteer for place matching
npm run harvest:run -- --days 1
npm run harvest:validate
npm run harvest:translate       # optional — needs Ollama
npm run harvest:import:yes -- tools/incident-harvest/output/YYYY-MM-DD/candidates.jsonl
```

Extra URLs: one per line in `tools/incident-harvest/input/urls.txt`.

Output is gitignored under `tools/incident-harvest/output/`.

### Ollama (`harvest:translate`)

- Calls `http://localhost:11434/api/chat`.
- Fills **`titleEn`** / **`summaryEn`** when the article is Bangla-only.
- Set model in `tools/incident-harvest/.env` (match `ollama list`):

```env
OLLAMA_MODEL=llama3.1:8b
```

The **API bulk normalizer does not call Ollama**. Without translate, English fields are often copied from Bangla and flagged **`translation`** for review.

### What harvest does *not* use LLM for

- **Incident type** — keyword rules in `tools/incident-harvest` (not the model).
- **District / map pin** — gazetteer + API `matchDistrict` + admin_areas centroids.
- **Publish** — admin only.

---

## After import — review & publish

### Admin UI (recommended)

1. **Incidents** → **Needs location** (or `?locationConfirmed=false`).
2. Open a row → adjust title/summary if needed → move the **map pin** inside the district → **Save changes** (sets `locationConfirmed`).
3. **Publish** (enabled only after location is confirmed).

Bulk-imported rows already have `summaryEn` (often copied from Bangla), so publish does not require an image.

### Dev: publish all import drafts (demo data)

After you have reviewed copy and accept district centroids as pins:

```bash
npm run api:publish-import-drafts
# Or one batch only:
node scripts/publish-import-drafts.mjs d9924d0c-004a-4ff9-8e6f-a4879e5390c5
```

This PATCH-confirms the existing coordinates and calls publish for each draft with an `import_batch_id`.

| Step | Why |
|------|-----|
| Filter **Needs location** | Centroid pin until editor saves the map |
| Fix **translation** rows | English title/summary for public UI |
| Save map pin inside district | Required before **Publish** in UI |
| **Publish** | Visible on the public map |

Duplicates: same canonical **`sourceUrl`** → skipped on re-import (`externalId` = SHA-256 of URL).

---

## npm scripts (reference)

| Script | Action |
|--------|--------|
| `harvest:env` | Create `tools/incident-harvest/.env` from API `.env.local` |
| `harvest:discover` / `harvest:scrape` / `harvest:run` | Feed → candidates |
| `harvest:validate` | Lint JSONL |
| `harvest:translate` | Ollama BN→EN |
| `harvest:import` | Dry-run + confirm |
| `harvest:import:yes` | Dry-run + import without prompt |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| **Bulk import disabled** / 404 | Set `ADMIN_BULK_IMPORT_ENABLED=true` or run API with `NODE_ENV=development` |
| **unknown GeoJSON type** on import | Fixed in API: geography must be GeoJSON `Point`, not WKT. Restart `api:dev` after pulling latest |
| **Map point must be inside district** | Only when `locationConfirmed=true` or on publish; pin inside selected district |
| **All rows skipped: duplicate** | Change `sourceUrl` or delete existing drafts with same `externalId` |
| **Login failed** (CLI) | `npm run harvest:env` or set `ADMIN_PASSWORD` in harvest `.env` |
| **Ollama unavailable** | Start Ollama; check `OLLAMA_MODEL`; translate step falls back to BN copy |
| **Invalid type** | Run `npm run api:seed` for `body_found` and other types |
| Map “data could not load” locally | Wrong API port — align `PORT` and `VITE_API_BASE_URL` ([env_backend.md](./env_backend.md)) |

---

## Legal / ops

- Harvest respects polite fetching (delay, cache); use **summary + `sourceUrl`**, not full article bodies in the product.
- Respect publisher terms of use; this tool is for **local editorial** workflows, not unattended production scraping.
