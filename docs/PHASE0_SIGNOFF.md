# Phase 0 — sign-off checklist

Complete this before starting **Phase 1** (`apps/api` scaffold).

## Decisions

- [x] Section 3 decisions recorded in [DECISIONS.md](./DECISIONS.md)
- [x] Incident type seed: [config/incident-types.seed.json](../config/incident-types.seed.json)
- [ ] Product owner reviewed plan section 1 (end result) and section 2 (FR/NFR) — **your sign-off**

## Repo artifacts (Phase 0 implementation)

- [x] Root [README.md](../README.md), [.gitignore](../.gitignore), [package.json](../package.json)
- [x] [config/incident-types.seed.json](../config/incident-types.seed.json)
- [x] [apps/api/.env.example](../apps/api/.env.example), [apps/web/.env.example](../apps/web/.env.example)
- [x] [scripts/phase0-check-env.mjs](../scripts/phase0-check-env.mjs)
- [x] [loading-splash.html](../reference/prototypes/loading-splash.html) + `apps/web/public/logo.svg` (production logo)

## Accounts & env

- [ ] [Neon](https://neon.tech) project created; **PostGIS** enabled on database (`CREATE EXTENSION postgis;` after first connect)
- [ ] [Upstash](https://upstash.com) Redis database created (REST URL + token)
- [ ] `apps/api/.env.local` copied from [apps/api/.env.example](../apps/api/.env.example) and filled
- [ ] `apps/web/.env` copied from [apps/web/.env.example](../apps/web/.env.example) and filled
- [ ] Run `npm run phase0:check` from repo root (after `npm install` in Phase 1)

## Brand & prototypes (reference)

- [x] Placeholder logo: [assets/brand/logo.svg](../assets/brand/logo.svg)
- [x] MVP loading splash prototype: [loading-splash.html](../reference/prototypes/loading-splash.html) (open in browser)
- [ ] Domain plan: `lashkoi.com` + `api.lashkoi.com` (or staging URLs documented below)

| Environment | Web URL | API URL |
|-------------|---------|---------|
| Local | http://localhost:5173 | http://localhost:3000 |
| Staging | _TBD_ | _TBD_ |
| Production | _TBD_ | _TBD_ |

## Out of scope (confirmed)

- Three.js intro (section 16 of plan)
- BDCP codebase build
- Public user accounts

## Next step

**Phase 1:** scaffold `apps/api` per plan — say *execute Phase 1* in Cursor when ready.
