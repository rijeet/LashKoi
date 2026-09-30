# Incident harvest (local only)

Editorial curation pipeline: discover URLs from Prothom Alo / Daily Star feeds → fetch article HTML → classify by keywords → write `candidates.jsonl` → import as **draft** incidents via the LashKoi API.

**Full guide (JSON bulk, admin UI, Ollama, troubleshooting):** [docs/bulk_import_harvest.md](../../docs/bulk_import_harvest.md)

## Setup

```bash
npm install
npm run harvest:env
# Or: cp tools/incident-harvest/.env.example tools/incident-harvest/.env and set ADMIN_PASSWORD
npm run api:migrate
npm run api:seed
npm run harvest:export-areas
```

Enable bulk import locally in `apps/api/.env.local`:

```env
ADMIN_BULK_IMPORT_ENABLED=true
```

## Daily workflow

```bash
npm run harvest:run -- --days 1
npm run harvest:validate
npm run harvest:translate   # optional, needs Ollama (OLLAMA_MODEL in .env)
npm run harvest:import:yes -- path/to/candidates.jsonl
```

Paste extra URLs into `tools/incident-harvest/input/urls.txt` (one per line).

Output is gitignored under `tools/incident-harvest/output/YYYY-MM-DD/`.

## Legal / ops

- Respect publisher ToS; use summaries + `sourceUrl` only (no full article body in output).
- Polite fetcher: robots.txt, ~2.5s delay per host, cached HTML in `.cache/`.
