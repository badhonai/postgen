# PostGen

Twitter/X post studio for web3 projects — store & organize posts, keep per-project
knowledge/sources/assets, and let **free external AI tools** (Claude Desktop,
Gemini CLI, local Ollama, self-hosted n8n) draft & update posts via a **REST API
+ MCP server**. Agents write **drafts only**; you approve.

**Hard constraint: $0 forever** — every component runs on a free tier or is open
source. No paid API keys, ever. See `PLAN.md` §7 for the zero-cost guarantee.

Hosted at: **<https://postgen.pages.dev>** (Cloudflare Pages free tier)

---

## Git workflow — `main` only, every commit is live

No feature branches, no preview environments — **real tests on real production**.

- Every commit pushed to `main` **deploys immediately**: Cloudflare Pages redeploys
  the site, and the Supabase GitHub integration ("Deploy to production") applies
  any new migrations.
- Something broke? `git revert <bad-commit>` (or reset to the last good commit)
  and push — production rolls back the same way.
- Never commit secrets (`.env` is gitignored). The repo is public and every
  commit is live.

---

## Stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 | free (OSS) |
| Hosting / API | Cloudflare Pages + Pages Functions | free tier |
| Media | Cloudflare R2 (private, signed reads) | free tier (10 GB) |
| DB & Auth | Supabase (Postgres + Auth + RLS) | free tier |
| Agents | REST `/api/v1/*` + MCP `/api/mcp` (external free AI tools) | $0 |

---

## Project structure

```
postgen/
├─ functions/api/          # Pages Functions (health now; agent API in M4)
├─ src/                    # React app
├─ supabase/               # watched by the Supabase GitHub integration
│  ├─ config.toml          # supabase CLI config (project_id = "postgen")
│  ├─ migrations/          # auto-applied on push to main
│  │  ├─ 20261012000001_init.sql    (schema + RLS)
│  │  └─ 20261012000002_dedupe.sql  (no-repeat posts engine)
│  └─ seed.sql             # preview-branch / local seed only
├─ .github/workflows/      # keepalive.yml — keeps Supabase free tier awake
│                          # db-push.yml  — opt-in migration fallback
├─ wrangler.toml           # Pages config + R2 binding (MEDIA)
└─ PLAN.md                 # full plan & roadmap
```

---

## Local development

```bash
npm install
npm run dev            # Vite dev server (UI only)
npm run pages:dev      # build + wrangler pages dev (UI + /api/* functions)
npm run build          # typecheck + production build
npm run deploy         # wrangler pages deploy (after first-time setup below)
```

> **Node version:** wrangler is pinned to `4.86.0` — the last release that runs
> on Node 20 (20.3+). If you use Node 22+, feel free to `npm i -D wrangler@latest`
> and raise `compatibility_date` in `wrangler.toml`. Cloudflare Pages' own
> builds use Node 22 and are unaffected either way.

---

## First-time setup (all free)

### 1. Supabase (free tier) — GitHub integration

Migrations deploy **the Supabase way**: the
[GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
watches this repo and applies `supabase/migrations/*` automatically.

1. Create a project at <https://supabase.com> (Free plan).
2. Push this repo to GitHub.
3. Supabase Dashboard → **Project Settings → Integrations → GitHub Integration** →
   **Authorize GitHub** → choose your repo.
4. Set **Working directory** to `.` (our `supabase/` folder is at the repo root).
5. Integration options:
   - ✅ **Deploy to production** — **ON**. New migrations are applied automatically
     on every push/merge to `main`. (This is Supabase's
     [recommended deployment path](https://supabase.com/docs/guides/deployment/going-into-prod).)
   - ⛔ **Automatic branching** — **OFF**. This is the *only* paid piece
     (Supabase Pro plan + ~$0.013/branch/hour for PR preview databases) —
     excluded by our $0 rule. If you ever upgrade to Pro, flipping it ON gives
     you preview databases for every PR; the repo is already structured for it.
6. Click **Enable integration**. On the first deploy it runs
   `20261012000001_init.sql` (schema + RLS) and `20261012000002_dedupe.sql`
   (no-repeat engine) — schema changes from then on ship by merging to `main`.
7. Authentication → Providers → Email: enabled (default). Turn off "Confirm email"
   for frictionless local testing (optional).
8. Project Settings → API: copy the **Project URL**, **anon key**,
   **service_role key**, and **JWT secret** (for step 2 & later Pages secrets).

> **If you already ran the SQL by hand**, prefer a fresh project (or reset it) so
> the migration history (`supabase_migrations.schema_migrations`) starts clean.
>
> **Can't enable the integration?** Use the free fallback workflow
> `.github/workflows/db-push.yml`: set repo variable `USE_SUPABASE_ACTION=true`
> and secret `SUPABASE_DB_URL` (Session pooler string from Dashboard → Connect).

### 2. Environment

```bash
cp .env.example .env   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

Server-side secrets (Pages Functions) — set in Cloudflare dashboard
(Pages → Settings → Environment variables) or via `wrangler pages secret put`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

### 3. R2 media bucket (free tier)

1. Cloudflare dashboard → R2 → Create bucket `postgen-media`.
2. The binding `MEDIA` is already declared in `wrangler.toml`. If you deploy via
   the dashboard instead of `wrangler`, add the R2 binding manually
   (Pages → Settings → Functions → R2 bucket bindings: variable `MEDIA`).

### 4. Cloudflare Pages

**Option A — Git integration (recommended):** push this repo to GitHub →
Cloudflare Pages → Create project → connect repo → build command
`npm run build`, output `dist`. Pages picks up `wrangler.toml` automatically.

**Option B — direct deploy:** `npm run deploy` (wrangler login first).

### 5. Keep-alive (so the Supabase free project never pauses)

GitHub repo → Settings → Secrets → Actions → add `SUPABASE_URL` and
`SUPABASE_ANON_KEY`. The workflow `.github/workflows/keepalive.yml` pings the
project every Monday & Thursday (free on GitHub Actions).

---

## No-repeat posts 🔁

Every write (web app **and** agent API) is checked against your own posts:

1. **Exact duplicates** — normalized text is hashed (`content_hash`, sha256);
   same content → blocked (`409 duplicate` on the API).
2. **Near-duplicates** — Postgres `pg_trgm` similarity ≥ 0.65 → blocked
   (`409 similar` + list of matching posts).
3. **Override** — intentional A/B variants pass `"allow_similar": true`
   (or click "Save anyway" in the web dialog).

Normalization: lowercase · strip thread numbering (`1/n`) · collapse whitespace ·
replace URLs with `<URL>`. Scope is always *your* posts only (RLS).

---

## Roadmap

- **M0** ✅ scaffold, schema + RLS, dedupe engine, keep-alive, deploy config
- **M1** auth & projects (brand voice per project)
- **M2** posts CRUD, threads (n/n), X char counter, search, copy, no-repeat dialog
- **M3** R2 media upload + signed reads
- **M4** Agent API: REST + API keys + MCP + OpenAPI + drafts-only guardrails
- **M5** polish, ⌘K, export

Full detail in [`PLAN.md`](./PLAN.md).
