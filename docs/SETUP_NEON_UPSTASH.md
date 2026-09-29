# Neon + Upstash setup (Phase 0)

## 1. Neon PostgreSQL + PostGIS

1. Create a project at [Neon Console](https://console.neon.tech).
2. Copy the **pooled** connection string (`DATABASE_URL`) — use `?sslmode=require`.
3. Open **SQL Editor** on your branch and run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

4. Paste `DATABASE_URL` into `apps/api/.env.local` (create from `.env.example`).

### Optional: Cursor Neon MCP

If the Neon MCP is connected in Cursor, you can create/list projects from the agent; still paste secrets only into `.env.local`, never commit them.

## 2. Upstash Redis

1. Create a Redis database at [Upstash Console](https://console.upstash.com).
2. Enable **REST API**; copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Add both to `apps/api/.env.local`.

For **local dev without Upstash**, leave these unset — Phase 1 API will use in-memory cache fallback (plan NFR-03).

## 3. JWT admin bootstrap (Phase 1 migration)

Generate a strong secret (32+ chars):

```powershell
# PowerShell — example only; use your own random string
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Set in `apps/api/.env.local`:

- `JWT_SECRET=<generated>`
- `ADMIN_EMAIL=you@example.com`
- `ADMIN_PASSWORD=<temporary; change after first login flow exists>`

## 4. CORS

```env
CORS_ORIGINS=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
```

Production: add `https://lashkoi.com` (and staging web origin).

## 5. Verify (after Phase 1 scaffold)

```bash
cd apps/api
npm run start:dev
# GET http://localhost:3000/health
```
