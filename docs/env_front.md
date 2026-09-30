# Frontend environment (`apps/web`)

Save as **`apps/web/.env`** (local) or paste into **Vercel → Environment Variables** (web project, Root Directory `apps/web`).

`VITE_*` is baked into the browser at **build** — redeploy after changes.  
`LASHKOI_API_BASE_URL` is for **Vercel serverless** (`apps/web/api/*`), not the browser.

**Production pair:** web [https://lash-koi.vercel.app](https://lash-koi.vercel.app/) ↔ API `https://lashkoi-api.vercel.app` — backend env: [env_backend.md](./env_backend.md).

### Git

| Path | In git? |
|------|---------|
| [`apps/web/.env.example`](../apps/web/.env.example) | **Yes** — placeholders only |
| `apps/web/.env` | **No** — listed in [`.gitignore`](../.gitignore) |

Copy example → `.env`, fill values locally. Production secrets live in **Vercel**, not the repo.

---

## Copy — local (`apps/web/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SITE_URL=http://localhost:5173
LASHKOI_API_BASE_URL=http://localhost:3000/api/v1
```

---

## Copy — Vercel production (web project `lash-koi`)

Paste in **Vercel → lash-koi → Settings → Environment Variables** (Root Directory `apps/web`). Redeploy after edits.

```env
VITE_API_BASE_URL=https://lashkoi-api.vercel.app/api/v1
VITE_SITE_URL=https://lash-koi.vercel.app
LASHKOI_API_BASE_URL=https://lashkoi-api.vercel.app/api/v1
```

---

## Copy — Vercel preview (optional)

Use preview API URL or same as production.

```env
VITE_API_BASE_URL=https://lashkoi-api.vercel.app/api/v1
VITE_SITE_URL=https://lashkoi-git-preview-yourteam.vercel.app
LASHKOI_API_BASE_URL=https://lashkoi-api.vercel.app/api/v1
```

---

## Variable reference

| Variable | Required | When | Description |
|----------|----------|------|-------------|
| `VITE_API_BASE_URL` | Yes | Build | API base with `/api/v1` |
| `VITE_SITE_URL` | Yes | Build | Public web origin (canonical / SEO) |
| `LASHKOI_API_BASE_URL` | Yes on Vercel | Runtime (serverless) | Same API base for sitemap, robots, meta-injection |

**API must allow your web origin:** `CORS_ORIGINS`, `PUBLIC_SITE_URL`, `SITEMAP_BASE_URL` on the backend — see [env_backend.md](./env_backend.md).

Deploy: [DEPLOY.md](./DEPLOY.md)
