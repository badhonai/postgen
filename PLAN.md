# PostGen — Twitter/X Post Studio for Web3 Projects

> Plan v1.5 — 2026-10-13
> Status: **ALL MILESTONES (M0–M5) BUILT & LIVE ON MAIN** 🎉 — PostGen is feature-complete per this plan
> v1.5 change: **JWT strategy locked** — Supabase **signing keys (ES256)** + JWKS verification; agent JWTs minted via an imported signing key; legacy HS256 secret is fallback only (§6, §12.12).
> v1.4 change: migrations deploy via **Supabase GitHub integration** ("Deploy to production" ON). Automatic branching (PR preview DBs) is Pro-only → OFF per the $0 rule; repo structured per docs so enabling it later is one click.
> v1.3 change: **No repeat posts** — exact + near-duplicate detection on every write (web + agent API), see §5 M2 & §6.

A private workspace to **store and organize Twitter/X posts** for multiple web3 projects. Each project carries its own knowledge base, sources, and media assets. **Free external AI tools** (Claude Desktop, Gemini CLI, local models…) connect to PostGen and draft/update posts — you review and approve.

---

## 1. Goals & Constraints

| Decision | Choice |
|---|---|
| Frontend | React + Vite (+ TypeScript) — all OSS, free |
| Hosting | Cloudflare Pages (free tier) → `postgen.pages.dev` |
| DB & Auth | Supabase free tier (Postgres + Auth + RLS) |
| Media storage | Cloudflare **R2** free tier (10 GB) |
| Users | You + 1 friend. **Strict isolation**: RLS per user |
| AI | **External, free AI tools** connect in via REST API + MCP (Claude Desktop *free*, Gemini CLI, local Ollama, self-hosted n8n…) |
| Agent write policy | **Drafts only** — agents create/update `idea`/`draft`; only you approve/publish |
| Content types | Promotional & educational posts, per project |
| Duplicates | **No repeat posts** — exact-hash + near-duplicate detection blocks repeats on every write (override: `allow_similar`) |
| 💰 Cost policy | **$0 forever.** Only free tiers & open source. No paid API keys, no paid plans, no paid add-ons — not even optional ones |

**Out of scope for v1** (and kept free if ever added): X API publishing, scheduling, billing, teams/sharing, in-app LLM generation.

---

## 2. Architecture

```
 Free external AI tools — the "brain"
   Claude Desktop (free) · Gemini CLI (free) · Ollama/local (100% free)
   self-hosted n8n (free) · curl/any script (free)
      │ REST  /api/v1/*        │ MCP  /api/mcp         │ OpenAPI spec
      ▼                       ▼                       ▼
┌────────────────────────── Cloudflare Pages (postgen.pages.dev) ─────────────┐
│  React SPA                      Pages Functions                             │
│   · dashboard, editor           · /api/v1/*   REST API + API-key auth       │
│   · post/threads UI             · /api/mcp    MCP server (same service)     │
│   · "Connect your AI" page      · /api/media  upload → R2, signed reads     │
└──────┬────────────────────────────────┬─────────────────────────────────────┘
       │ supabase-js (logged-in user)   │ key → user_id → mint Supabase JWT
       ▼                                ▼  (RLS applies to agents too)
┌────────────────────────────┐   ┌─────────────────────────────┐
│ Supabase (free tier)       │   │ Cloudflare R2 (free tier)   │
│  Auth + Postgres + RLS     │   │  media (private)            │
└────────────────────────────┘   └─────────────────────────────┘
```

**Why this split?**
- **Supabase** owns identity + data; RLS enforces isolation at the DB level. Agents act *as you* (JWT minted from the API key), so RLS covers them too.
- **Pages Functions** (free) expose one service layer as three surfaces (REST, MCP, OpenAPI) so any free AI tool can connect.
- **No LLM runs inside PostGen** and **no AI API key is needed**. Your free AI tool is the brain; PostGen is the system of record.

---

## 3. Tech Stack (100% open source / free)

| Layer | Choice | License/cost |
|---|---|---|
| Build | Vite + React + TypeScript | MIT, free |
| Routing | React Router v7 | MIT, free |
| Server state | TanStack Query v5 | MIT, free |
| Styling | Tailwind CSS v4 + shadcn-style components | MIT, free |
| Forms | react-hook-form + zod | MIT, free |
| Auth/DB | `@supabase/supabase-js` v2 | Apache-2.0, free (free tier) |
| Agent API | REST + **MCP Streamable HTTP** (hand-rolled JSON-RPC, Workers-native) + OpenAPI 3.1 | Apache-2.0/MIT, free |
| JWT | `jose` — JWKS verification + ES256/HS256 signing | MIT, free |
| Cloudflare | `wrangler` (R2 binding) | Apache-2.0, free (free tier) |
| Keep-alive | GitHub Actions cron (see §7) | free tier |
| Code quality | ESLint + Prettier | MIT, free |

---

## 4. Data Model (Supabase Postgres)

All tables: `id uuid pk default gen_random_uuid()`, `created_at/updated_at`, **`user_id`**, RLS policy `user_id = auth.uid()`.

```
profiles          id → auth.users, display_name

projects          user_id, name, slug, description,
                  brand_voice jsonb        -- tone, emoji policy, taboo words,
                                           -- hashtag rules, CTA style
                  unique(user_id, slug)

knowledge         user_id, project_id,
                  kind: 'knowledge' | 'source',
                  title, content text,     -- notes/docs (knowledge)
                  url, notes text          -- reference links (source)

assets            user_id, project_id,
                  r2_key unique, filename, mime_type, size_bytes,
                  width, height, alt_text

posts             user_id, project_id,
                  category: 'promotional' | 'educational' | 'announcement' | 'other',
                  status:   'idea' | 'draft' | 'approved' | 'scheduled'
                            | 'published' | 'archived',
                  title text               -- internal label
                  created_via: 'web' | 'api' | 'mcp'   -- badge "drafted by Claude"
                  content_text text,       -- normalized thread text → dedupe + FTS
                  content_hash text,       -- sha256(content_text) → exact-dup lookup
                  scheduled_at, published_at

post_tweets       post_id, position int,   -- 1..n  → threads "n/n"
                  content text
                  unique(post_id, position)

post_media        post_tweet_id, asset_id, position

tags / post_tags  user_id-scoped tags on posts

api_keys          user_id, name,           -- e.g. "Claude", "gemini-cli"
                  key_hash, prefix,        -- pgk_live_a1b2… (prefix shown, secret hashed)
                  last_used_at, expires_at, revoked_at

agent_activity    user_id, api_key_id, surface: 'rest' | 'mcp',
                  action, target_post_id, request jsonb   -- audit feed in app

generations       (backlog) optional prompt/output audit
```

**Threads from day one** — educational web3 content lives in threads.
**Child tables** RLS via `user_id = auth.uid()` (or `exists` on parent `posts`).

---

## 5. Features

### M0 — Foundation
- Vite + TS + Tailwind + Router scaffold, lint
- GitHub repo → Cloudflare Pages (build `npm run build`, output `dist`)
- `wrangler.toml` with R2 binding; `.env.example`
- Supabase project + `supabase/` layout for the **GitHub integration** (`config.toml`, timestamped `migrations/`, `seed.sql`) — migrations auto-apply on push to main
- **Keep-alive workflow** (GitHub Actions cron, free): pings Supabase 2×/week so the free project never auto-pauses

### M1 — Auth & Projects
- Email + password auth (Supabase), protected routes, profile
- Projects CRUD: name, description, **brand voice** editor
- Dashboard: projects grid + recent posts + agent activity strip

### M2 — Posts CRUD
- Post editor: category, status workflow `idea → draft → approved → scheduled → published → archived`
- **Thread builder**: add/reorder/delete tweets, live `n/n` numbering
- Live **X character counter** (280 weighted, links=23)
- Tags, filters, full-text search
- **One-click copy** (single tweet or numbered thread)
- Explicit save is the **no-repeat gate** (create + update run the full dupes check); debounced autosave moved to M5 so it can't bypass the gate
- `created_via` badge ("drafted via MCP")
- **No-repeat guard**: every save runs exact-hash + similarity check against *your* posts → dialog lists similar posts (view / save anyway / cancel)

### M3 — Media (R2)
- Drag & drop upload → Pages Function → R2
- **Signed short-lived URLs** for reads (media stays private)
- Image preview, aspect hints, attach to tweet or project asset library
- Free-tier guards: images ≤ 10 MB, videos ≤ 50 MB, soft cap 5 GB/user (well inside R2's free 10 GB)

### M4 — Agent API (the core AI feature)
One service layer, three surfaces — see §6:
- **M4a — REST API** `/api/v1/*` + **API key management** UI (create/revoke, shown once, last-used)
- **M4b — MCP server** `/api/mcp` (Streamable HTTP, bearer auth): `list_projects`, `get_project_knowledge`, `list_posts`, `get_post`, `search_posts`, `create_post`, `update_post`, `set_thread`, `add_tweet`, `delete_tweet`
- **M4c — "Connect your AI" page**: copy-paste configs for **Claude Desktop (free)**, **Gemini CLI (free)**, **local Ollama (free)**, **self-hosted n8n (free)**; OpenAPI spec link
- **Guardrails**: zod validation, rate limit, **drafts-only write policy** (403 on approve/publish/archive attempts), full `agent_activity` audit feed

### M5 — Polish
- ⌘K command palette, dark/light theme, empty states, toasts
- JSON/CSV **export** (backup of all data)

---

## 6. External Agent Integration (REST + MCP) — free tools only

Any free AI tool becomes "the agent". PostGen is the system of record.

### Surfaces

| Surface | Who uses it | Auth |
|---|---|---|
| REST `postgen.pages.dev/api/v1/*` | self-hosted n8n, Make (free tier), curl, scripts | `Authorization: Bearer pgk_live_…` |
| OpenAPI `/api/v1/openapi.json` | any OpenAPI-compatible tool | API key |
| MCP `postgen.pages.dev/api/mcp` | Claude Desktop, Gemini CLI, Cline/Roo, Ollama clients | bearer key in headers |

### API keys
- **Settings → AI connections**. Name it, secret shown **once**, stored as SHA-256 hash, visible prefix `pgk_live_a1b2…`
- Revoke / rotate, `last_used_at`, optional expiry
- Request → key → `user_id` → **mint a short-lived Supabase JWT as that user** → normal **RLS** applies
- **JWTs — signing keys (not the legacy secret):** new Supabase projects sign tokens with asymmetric **JWT signing keys (ES256)**. PostGen verifies user tokens against the project JWKS (`jose`), and mints agent JWTs with an **imported signing key** (generate: `supabase gen signing-key`; import: Dashboard → Authentication → JWT Keys; private JWK stored as the Pages secret `SUPABASE_JWT_SIGNING_KEY`). If a project still exposes the legacy HS256 `SUPABASE_JWT_SECRET`, it works as a fallback.

### REST endpoints

**Read (agents need context to write informed posts):**
```
GET    /api/v1/projects                      list my projects
GET    /api/v1/projects/:id                  project + brand_voice
GET    /api/v1/projects/:id/knowledge        knowledge & sources
GET    /api/v1/posts                         ?project_id&status&category&tag&q
GET    /api/v1/posts/:id                     post + tweets + media
GET    /api/v1/tags
```

**Write (status hard-capped to `idea` / `draft`):**
```
POST   /api/v1/posts                         create draft
       { project_id, category, title, tweets: ["1/3 …", "2/3 …"], tag_names: [] }
PATCH  /api/v1/posts/:id                     edit title / category / tags
PUT    /api/v1/posts/:id/tweets              replace / reorder the thread
POST   /api/v1/posts/:id/tweets              append one tweet
DELETE /api/v1/posts/:id/tweets/:tweet_id    remove one tweet
```

**Forbidden via API** (human-only in the web app): `approved` / `scheduled` / `published` / `archived` → **403**. Updating a non-draft post → **403**.

**No repeat posts (dedupe on every write):** posts store `content_hash` (normalized text) + `content_text` (for pg_trgm similarity). `POST /posts`, `PUT /posts/:id/tweets`, and `POST /posts/:id/tweets` run the check first:
- exact duplicate → **409** `{ error: "duplicate", duplicate_of: <post_id> }`
- near-duplicate (similarity ≥ 0.65) → **409** `{ error: "similar", similar: [{ id, title, similarity }] }`
- intentional A/B variant → pass `"allow_similar": true` to save anyway
Scope: the key owner's posts only (RLS) — never leaks across users. Agents get the 409 + similar list so they rewrite instead of repeating.

### MCP tools (1:1 with REST)
```
list_projects · get_project · get_project_knowledge
list_posts · get_post · search_posts
create_post · update_post · set_thread · add_tweet · delete_tweet
```
Plus MCP resources: `postgen://projects`, `postgen://project/{id}/knowledge`.

### Connection recipes — every path below is free

**1. Claude Desktop (free claude.ai account)** — `claude_desktop_config.json`, via the free `mcp-remote` bridge:
```json
{
  "mcpServers": {
    "postgen": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "https://postgen.pages.dev/api/mcp",
        "--header", "Authorization: Bearer ${POSTGEN_API_KEY}"
      ],
      "env": { "POSTGEN_API_KEY": "pgk_live_…" }
    }
  }
}
```

**2. Gemini CLI (free, open source, Google account quota)** — `.gemini/settings.json`:
```json
{
  "mcpServers": {
    "postgen": {
      "httpUrl": "https://postgen.pages.dev/api/mcp",
      "headers": { "Authorization": "Bearer pgk_live_…" }
    }
  }
}
```

**3. 100% local & offline — Ollama + any free MCP client** (Cherry Studio, Cline/Roo in VS Code): point the client at the same `/api/mcp` URL. Model runs on your machine = $0 forever.

**4. Self-hosted n8n / Make free tier / plain scripts** — HTTP Request node → `Authorization` header → `POST /api/v1/posts`. (n8n cloud is *not* required — run it locally via Docker, free.)

**Not recommended (paid, excluded):** ChatGPT custom GPT Actions and Cursor both require paid plans — they still *work* with our API if you happen to have them, but the plan does not depend on them.

### Guardrails & audit
- zod validation on every body; max 25 tweets/thread; weighted char limits
- Rate limit: 60 req/min per key (plenty; keeps free tiers safe)
- Every call logged to `agent_activity` → in-app **Agent activity** feed
- `posts.created_via` = `'api' | 'mcp'` → UI badge "drafted by Claude"
- Recipes tell the agent: write drafts only; humans approve

---

## 7. 🆓 Zero-Cost Guarantee — every component, its free tier, and how we stay inside it

| Component | Free tier (what we use) | How we stay free |
|---|---|---|
| Cloudflare Pages + Functions | Unlimited bandwidth, 500 builds/mo, **100k function req/day** | 2 users ≈ negligible traffic |
| Cloudflare R2 | **10 GB storage**, 1M writes / 10M reads per month, $0 egress *always* | Upload caps (img ≤10 MB, video ≤50 MB), 5 GB soft cap/user |
| Supabase free | 500 MB DB, 50k MAU, 2 projects, 5 GB egress | Text-only data ≈ nothing; 2 users |
| Supabase GitHub integration | **Deploy to production** (auto migrations on push) — free | **Automatic branching** (PR preview DBs) is Pro-only → stays OFF |
| Supabase auto-pause | Free projects pause after ~7 days idle | **GitHub Actions cron (free) pings the DB 2×/week** |
| GitHub Actions | 2,000 min/month free | One 10-second job per run |
| Domain | `postgen.pages.dev` free | No custom domain needed |
| AI | **$0 by design** — see below | No LLM in our infra, no API keys |
| All libraries | Open source (MIT/Apache) | — |

**The AI is $0 by design:**
- PostGen itself **never calls an LLM** — no token costs, ever.
- Agents run on free tools: **Claude Desktop (free tier)**, **Gemini CLI (free quota)**, **local Ollama (free forever)**, **self-hosted n8n (free)**.
- If we ever add in-app generation (backlog), it must use **Workers AI free tier (10k neurons/day)** or **Gemini API free tier** — never a paid key.

**If any free limit is approached:** we set soft caps in-app (upload quotas, rate limits) and degrade gracefully (block new uploads, keep everything readable). You'll never get a surprise bill because there is no bill.

---

## 8. Repo Structure

```
postgen/
├─ functions/
│  └─ api/
│     ├─ v1/                     # REST API
│     │  ├─ projects/…
│     │  ├─ posts/…
│     │  ├─ openapi.json.ts
│     ├─ mcp.ts                  # MCP server (Streamable HTTP)
│     ├─ media/…                 # upload + signed read
│     └─ _lib/                   # auth (API key→JWT), repos, zod, audit
├─ src/
│  ├─ components/
│  ├─ features/
│  │  ├─ auth/  projects/  posts/  media/  knowledge/  connections/
│  ├─ lib/                       # supabase client, api, x-counter, format
│  ├─ pages/                     # Dashboard, ProjectDetail, PostEditor,
│  │                             # Settings, ConnectAI
│  ├─ App.tsx  main.tsx
├─ .github/workflows/keepalive.yml   # free Supabase keep-alive cron
├─ .github/workflows/db-push.yml     # opt-in free migration fallback
├─ supabase/
│  ├─ config.toml                    # CLI config (project_id = "postgen")
│  ├─ migrations/                    # auto-applied on push to main
│  └─ seed.sql                       # preview-branch / local seed only
├─ public/
├─ .env.example
├─ vite.config.ts
├─ wrangler.toml
├─ package.json
└─ PLAN.md
```

---

## 9. Security & Privacy

- RLS on every table — agents act as you (minted JWT), so RLS covers them too.
- API keys: SHA-256 hashed at rest, prefix-only display, revoke/rotate.
- Service-role key only in Pages Functions env; never in the browser.
- R2 objects private; reads via short-lived signed URLs after auth + ownership check.
- Zod validation + rate limits + drafts-only write policy on agent surfaces.
- Full agent audit feed (`agent_activity`).
- No analytics/trackers (they can cost money anyway).

---

## 10. Enhancement Ideas ("make it more good") — free-only backlog

**High value, cheap (in time) to add**
1. 🧵 **Thread builder + n/n numbering** — in v1 (M2).
2. 🅰️ **A/B variants** — agent writes 3 takes in one draft; you keep the best.
3. 📋 **Post templates** — exposed to agents as `postgen://templates`.
4. 📥 **Idea inbox** — dump raw ideas/alpha links; agent turns them into drafts (`GET /api/v1/inbox`).
5. ✍️ **Style learning** — `brand_voice` + example approved posts in `get_project_knowledge`.
6. 🎨 **Promo images with Workers AI** (SDXL/flux — free 10k neurons/day) — only if it stays inside the free tier.

**Workflow**
7. Kanban board view (idea → draft → approved → published).
8. Version history per post (`post_revisions`) — restore any agent edit.
9. Post-publish tracking: paste tweet URL to store likes/RTs manually (no paid X API).

**Agent API extras**
10. Scoped keys — read-only keys, per-project keys.
11. Webhooks to free targets (Telegram bot API, self-hosted n8n) when a new draft lands.
12. `/api/v1/inbox` for raw idea capture from anywhere.

**Content quality**
13. Hashtag & mention library per project (agent-readable).
14. "Best practices" checker: link placement, hook strength, thread cliffhanger.
15. Alt-text helper for media (local heuristics or agent-supplied — free).

**Phase 2 (only if it can be $0)**
16. X API — **free tier only** (very limited writes); otherwise stay copy/paste. Never a paid X tier.
17. Content calendar month view.
18. Shareable read-only portfolio page (Pages, free).
19. In-app generate panel — **Workers AI free tier only** (no paid keys).

---

## 11. Milestones & Build Order

| Milestone | Deliverable | Est. scope |
|---|---|---|
| **M0** ✅ done | Scaffold + deploy + DB migration + keep-alive cron | small |
| **M1** ✅ done | Auth + projects + dashboard | medium |
| **M2** ✅ done | Posts CRUD + threads + counter + search + copy + no-repeat dialog | large |
| **M3** ✅ done | R2 media upload/signed reads | medium |
| **M4a** ✅ done | REST Agent API + API-key management + OpenAPI spec | medium |
| **M4b** ✅ done | MCP server + Connect-your-AI page + guardrails + audit feed | large |
| **M5** ✅ done | Polish: shortcuts, themes, export | medium |

We build milestone by milestone, testing each before moving on.

---

## 12. Assumptions / Decisions Taken (flag if wrong)

1. **Threads are included in v1** (needed for educational posts).
2. Categories: `promotional | educational | announcement | other` (extensible).
3. Auth = email + password.
4. **AI is fully external and must be free** — Claude Desktop free / Gemini CLI / local Ollama / self-hosted n8n. No paid AI plan or API key anywhere.
5. **Agents write drafts only**; humans approve/publish in the web app.
6. Media private + signed URLs.
7. **$0 forever** — if a feature can't be built on free tiers, it doesn't get built (e.g. paid X API tiers are permanently out).
8. Supabase free auto-pause is handled by a free GitHub Actions keep-alive ping.
9. **No repeat posts** is enforced server-side: exact match on normalized `content_hash`, near-duplicate via pg_trgm similarity ≥ 0.65; `allow_similar: true` is the explicit override for intentional variants.
10. **Migrations deploy via the Supabase GitHub integration** ("Deploy to production" ON, recommended in Supabase's production checklist for all plans). "Automatic branching" preview DBs are Pro-only and stay OFF under the $0 rule.
11. **Git workflow: `main` only** — no feature/preview branches. Every commit pushed to `main` is live (Cloudflare Pages + Supabase migrations). Rollback = revert to an older commit and push.
12. **JWTs use Supabase's newer signing keys (ES256)** — JWKS verification + externally minted agent JWTs via an imported signing key; the legacy HS256 JWT secret is fallback only. New projects' API keys are the publishable/secret pair (legacy anon/service_role still accepted).
13. **Auth is whitelist-only** — no public sign-up, email confirmation off; the admin creates users in the Supabase dashboard. The login page is sign-in only.

---

## 13. Next Steps

**All milestones are built and live.** What remains is real-world use:

1. ✅ **M0–M5 complete** — scaffold, schema+RLS+dedupe, auth, projects, posts/threads, R2 media, Agent API + MCP, polish (autosave + banner, ⌘K palette, accent themes, export/import, skeletons).
2. ✅ **A→Z E2E green (2026-10-13): 31/31** via `scripts/e2e.mjs` against production. It caught 3 real bugs, now fixed: media URL signing had no configured secret (falls back to the service key), agent draft saves were rejected by the save RPC ('not authenticated' — service-role calls pass the actor via `p_user_id`), and the agent-side no-repeat guard never ran (same actor fix on `find_duplicate_post`/`find_similar_posts`).
3. ✅ **Project profile** (2026-10-13) — logo + asset kinds, X username, official links & contract addresses, chain/ticker, content pillars, sample posts, custom instructions; blacklist enforced (agent 403 / web warning); full profile flows into agent context (REST + MCP resource).
4. **Next: redesign the whole UI**, then resume real-world use (projects, threads, Claude/Gemini connections).
5. **Optional future ideas** (not in scope): scheduled posting to X, light theme, per-key scopes, webhooks.
