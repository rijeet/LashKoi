# BDCP-style partner feed (LashKoi API + CORS)

Use when **[জনদৃষ্টি / BDCP](https://bdcp.vercel.app/)** (or a related site such as [bdvote2026](https://bdvote2026.vercel.app/)) loads LashKoi data in the **browser** via `fetch`.

BDCP’s own tracker today uses BDCP’s backend and categories (e.g. সার সংকট, ব্যবসা). LashKoi exposes a **compatible-shaped** bundle at `/governance/tracker` for **map incident types** (extortion, measles, kidnap, dengue)—use it for a LashKoi widget block or a separate “incident map” feed, not as a drop-in replacement for the full BDCP API.

Shape reference: [BDCP `governance-tracker-api.md`](../../BDCP/governance-tracker-api.md). LashKoi does **not** implement the full BDCP API—only the **tracker bundle** endpoint with compatible fields where possible.

---

## 1. Base URL

| Environment | API base |
|-------------|----------|
| Local | `http://localhost:3000/api/v1` |
| Production | `https://<your-api-host>/api/v1` |

Partner widget endpoint:

```http
GET /governance/tracker?locale=bn&incidentLimit=12
```

---

## 2. CORS (browser `fetch` only)

LashKoi uses **`CORS_ORIGINS`** (comma-separated), not BDCP’s `CORS_ORIGIN` name.

In **`apps/api/.env.local`** (or production API env):

```env
# LashKoi web + BDCP production (জবাবদিহিতা ট্র্যাকার on bdcp.vercel.app)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://bdcp.vercel.app,https://bdvote2026.vercel.app

# Links inside tracker JSON (detailUrl) — your deployed LashKoi map
PUBLIC_SITE_URL=https://your-lashkoi-web.vercel.app
```

**Production checklist for BDCP:** add **`https://bdcp.vercel.app`** to `CORS_ORIGINS` on the **LashKoi API** host, redeploy API, then point BDCP env at LashKoi only for the endpoints you wire up (see §5).

Restart the API after changing env (`npm run api:dev` or redeploy).

**Notes**

- **Server-side** calls (Next.js Server Components, `curl`, cron) do **not** need CORS.
- Origins must match **exactly** (scheme + host + port), e.g. `https://bdcp.vercel.app` with no trailing slash.
- Allowed methods: `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`.
- Custom header **`X-Partner-Key`** is allowed when you enable the partner key (below).

### Quick CORS check (browser)

From the partner origin’s devtools console:

```js
fetch('http://localhost:3000/api/v1/governance/tracker?locale=en&incidentLimit=3')
  .then((r) => r.json())
  .then(console.log);
```

If CORS fails, the console shows a blocked cross-origin error—add that page’s origin to `CORS_ORIGINS`.

---

## 3. Optional API key

If **`GOVERNANCE_PARTNER_KEY`** is set on the API, every tracker request must include:

```http
X-Partner-Key: <same secret>
```

If **`GOVERNANCE_PARTNER_KEY`** is unset (default local dev), the tracker is **public** (no header).

```env
# Production example
GOVERNANCE_PARTNER_KEY=generate-a-long-random-string
```

Browser example:

```js
fetch(`${API_BASE}/governance/tracker?locale=bn&incidentLimit=12`, {
  headers: { 'X-Partner-Key': process.env.NEXT_PUBLIC_LASHKOI_PARTNER_KEY },
});
```

Do **not** embed a secret partner key in public client bundles unless you accept that it can be extracted—prefer server-side proxy on the partner app for production secrets.

---

## 4. Response envelope (important vs BDCP)

LashKoi wraps success JSON:

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "statusCode": 200,
  "data": { /* tracker payload */ }
}
```

Partner code should use **`response.data`** (or your client’s unwrap helper), not the root object.

Inside **`data`**:

| BDCP concept | LashKoi field |
|--------------|----------------|
| `locale` | `locale` (`en` / `bn`) |
| `categories[]` | `categories` / `types` (incident **types**: extortion, measles, kidnap, dengue) |
| `category.slug` | type `code` (e.g. `dengue`, not BDCP `homicide`) |
| `incidents[]` | `incidents` with `title`, `category`, `latestNewsItem`, `detailUrl` |
| `featuredBanners` | `featuredBanners` |
| — | `generatedAt` |

Query params:

| Param | Description |
|-------|-------------|
| `locale` or `lang` | `en` / `bn` |
| `category` or `type` | Filter by incident type code |
| `q` | Trigram search (title / place / summary) |
| `incidentLimit` | 1–50, default 12 |

---

## 5. Partner app env (on [bdcp.vercel.app](https://bdcp.vercel.app/) repo)

In the **BDCP** Vercel project, only add these if you add a LashKoi-powered section (map strip, secondary feed, etc.). BDCP’s default tracker keeps using the BDCP API.

```env
# Optional — LashKoi as a second data source
NEXT_PUBLIC_LASHKOI_API_URL=https://api.lashkoi.example.com/api/v1
NEXT_PUBLIC_LASHKOI_SITE_URL=https://your-lashkoi-web.vercel.app

# If reusing BDCP’s existing accountability env names for the same widget:
NEXT_PUBLIC_ACCOUNTABILITY_API_URL=https://api.lashkoi.example.com/api/v1
NEXT_PUBLIC_ACCOUNTABILITY_SITE_URL=https://your-lashkoi-web.vercel.app
```

Example loader (Next.js):

```ts
const base = process.env.NEXT_PUBLIC_ACCOUNTABILITY_API_URL!;
const res = await fetch(`${base}/governance/tracker?locale=bn&incidentLimit=12`);
const json = await res.json();
const tracker = json.data; // LashKoi envelope
```

“Read more” links: use each incident’s **`detailUrl`** (built from `PUBLIC_SITE_URL` on the API).

---

## 6. Other public endpoints (no auth)

Partners can also call (same CORS rules):

| Use | Path |
|-----|------|
| Map markers | `GET /incidents?lang=bn&types=dengue` |
| Types / legend | `GET /incident-types?lang=bn` |
| Banners only | `GET /featured-banners?lang=bn` |
| Health choropleth data | `GET /stats/health-districts?type=dengue&lang=bn` |

Admin routes (`/admin/*`) require JWT and are not for public widgets.

---

## 7. Local smoke test

```powershell
curl.exe "http://localhost:3000/api/v1/governance/tracker?locale=en&incidentLimit=3"
```

Swagger: `http://localhost:3000/swagger` → tag **partner** → `GET /api/v1/governance/tracker`.
