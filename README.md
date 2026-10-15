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
├─ functions/api/          # Pages Functions
│  ├─ mcp.ts               # MCP server (Streamable HTTP) — 12 tools
│  ├─ media/               # upload · sign · [[key]] · delete  (R2, private)
│  ├─ v1/                  # REST agent API (+ index.ts = OpenAPI 3.1 spec)
│  │  ├─ projects.ts · projects/[id].ts · knowledge.ts
│  │  ├─ posts.ts · posts/[id].ts · posts/[id]/append.ts
│  │  ├─ assets.ts · assets/upload.ts
│  │  └─ prompts.ts · prompts/[id].ts     # the prompt library
│  └─ xprofile.ts          # X identity for previews
├─ functions/_lib/         # agentdb.ts (writers + guardrails), env, jwt, ratelimit…
├─ src/                    # React app
│  ├─ features/prompts/    # bento card, detail sheet, composer sheet, picker
│  ├─ features/{agents,auth,media,posts,projects}/
│  └─ pages/               # PromptLibraryPage.tsx = /prompts
├─ supabase/               # watched by the Supabase GitHub integration
│  ├─ config.toml          # supabase CLI config (project_id = "postgen")
│  ├─ migrations/          # auto-applied on push to main
│  │  ├─ 20261012000001_init.sql    (schema + RLS)
│  │  ├─ 20261012000002_dedupe.sql  (no-repeat posts engine)
│  │  ├─ 2026101300000{4..7}_*.sql  (post saver, post_media, created_via, profile)
│  │  └─ 20261014000003_image_prompts.sql  (the prompt library)
│  └─ seed.sql             # preview-branch / local seed only
├─ scripts/e2e.mjs         # live smoke test (auth → CRUD → dedupe → media → agent API → MCP)
├─ .github/workflows/      # keepalive.yml — keeps Supabase free tier awake
│                          # db-push.yml  — opt-in migration fallback
├─ tsconfig.functions.json # the ONLY thing that typechecks functions/ — `npm run typecheck`
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

### E2E smoke test (against a live deployment)

```bash
SUPABASE_URL=… SUPABASE_ANON_KEY=… BASE_URL=https://postgen.pages.dev \
E2E_EMAIL=… E2E_PASSWORD=… node scripts/e2e.mjs
```

Covers auth → web CRUD (RLS) → no-repeat dedupe → media upload/sign/serve/delete →
Agent REST → MCP → key revocation → cleanup. It creates and removes its own
throwaway data, so it is safe to run repeatedly (use a test account — sign-in is
whitelist-only).

> **Node version:** wrangler is pinned to `4.86.0` — the last release that runs
> on Node 20 (20.3+). If you use Node 22+, feel free to `npm i -D wrangler@latest`
> and raise `compatibility_date` in `wrangler.toml`. Cloudflare Pages' own
> builds use Node 22 and are unaffected either way.

---

## First-time setup (all free)

### 1. Supabase (free tier) — GitHub integration

> **Access model: whitelist-only.** Email confirmation is OFF and there is **no
> sign-up** — you create each user yourself in Dashboard → Authentication →
> Users → *Add user* (the web app's login page is sign-in only).

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
8. Project Settings → API: copy the **Project URL** and **publishable key**
   (`sb_publishable_…` → `VITE_SUPABASE_ANON_KEY`) and **secret key**
   (`sb_secret_…` → `SUPABASE_SERVICE_ROLE_KEY`). Dashboard → Authentication →
   **JWT Keys** is where you'll import a signing key later (M4, agent JWT minting).

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
- `SUPABASE_SERVICE_ROLE_KEY` — the project **secret key** (`sb_secret_…` on new
  projects; legacy `service_role` JWT also works)
- `SUPABASE_JWT_SIGNING_KEY` *(needed from M4)* — private JWK JSON of an
  **imported JWT signing key** (generate: `supabase gen signing-key`, import:
  Dashboard → Authentication → JWT Keys). Used to mint agent JWTs (ES256).
- `SUPABASE_JWT_SECRET` *(optional fallback)* — only if your project still
  exposes the legacy HS256 secret. New projects use **signing keys (ES256)**;
  verification goes through the project JWKS (`jose`). See PLAN.md §6.

- `SORSA_API_KEY` *(optional)* — free key from
  <https://api.sorsa.io/overview> (100 free requests, no card) for the
  **Sorsa Score** card on the Profile page. Served only via the server-side
  proxy `functions/api/sorsa.ts`, cached 24h (Sorsa scores update daily), so
  it costs at most one upstream request per account per day. Without it the
  card shows setup instructions instead of failing.

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

## Prompt library 📚

A **single shared library** of image prompts, reached from the dashboard bento grid
(it takes the slot of a project tile) at `/prompts`. Not per-project — one recipe
book for the whole account.

The page is a **bento grid of cards** (same tile language as the project
tiles). A card leads with its cover image at **full card width in the
image's actual aspect ratio — never cropped** — so the whole example
output is visible at a glance, then the name, a cover-count pill and one
truncated line of notes — **never the full prompt**. Tapping a card opens
a detail sheet with the whole prompt, the notes, the covers (also shown
at actual ratio) and Delete / Edit.

Writing happens in a **bottom sheet behind a small + in the header**:

- **+** → New prompt (name, the prompt itself, notes, reference media)
- **Edit** on a card → the same sheet, loaded
- **Add / Change** → a reference-media bottom sheet that lists your assets grouped
  by project; picked images become removable ✕ thumbnails
- **Delete** → inline confirm inside the detail sheet

The attached images are a **cover** — they show how the prompt's output
looks. They are **not** used as generation references unless the owner
turns on that prompt's **"Use cover as generation reference"** switch
(`use_reference_images`, default off). A prompt can also carry optional
**color codes** (`color_codes`, hex `#RRGGBB`, max 12) that generated
images must use.

The agent API enforces the cover rule server-side: list responses always
include `cover_assets` (preview only) and include the same images in
`reference_assets` **only** when `use_reference_images` is true. Agents
are instructed never to feed covers to an image model otherwise.

Schema (`supabase/migrations/20261014000003_image_prompts.sql`,
`20261016000006_prompt_cover_colors.sql`):

```
image_prompts   user_id, name, prompt, notes,
                reference_asset_ids uuid[]    -- ordered cover images, cross-project
                use_reference_images boolean  -- default false (cover only)
                color_codes text[]            -- optional hex palette
                + RLS user_id = auth.uid()
```

Agents get the same library read/write over REST and MCP
(`list_image_prompts`, `create_image_prompt`, `update_image_prompt`,
`delete_image_prompt`; `update_image_prompt` is a whole-object write —
send `use_reference_images` and `color_codes` too or they're reset).

---

## Media API (R2, private) 🖼️

Media lives in **R2** (free tier) and is never public. Flow:

- `POST /api/media/upload` — multipart (`file`, `project_id`, `width`, `height`)
  with a Supabase JWT → stored at `users/{uid}/projects/{pid}/…`, `assets` row created.
  Limits: images ≤ 10 MB, videos ≤ 50 MB, 5 GB/user soft cap.
- `GET /api/media/sign?key=…&ttl=300` — returns a short-lived signed URL.
- `GET /api/media/<key>?exp=…&sig=…` — streams the object (HMAC-signed, 5-min TTL),
  or serves it directly for a valid user JWT that owns the key.
- `POST /api/media/delete` — `{ "key" }` → removes R2 object + DB row (owner only).

## Performance ⚡

Built to stay smooth as projects/posts/media grow:

- **Query caching** — TanStack Query defaults: 30s stale / 10min GC, no
  refetch-on-focus; screens render from cache on revisit instead of
  refetching the world per navigation.
- **Code splitting** — every authed page is a lazy chunk (13–30 KB);
  landing/login ship only the app shell.
- **Batched image signing** — `POST /api/media/sign-batch` signs up to
  100 asset URLs per request; the client coalesces a grid's worth of
  `useAssetUrl` calls into one round-trip (old per-image `/sign` kept
  as fallback).
- **Media caching** — signed media responses are `private, max-age=300,
  immutable` with ETag/304 revalidation (uploads mint fresh keys, so a
  key's bytes never change).
- **Upload optimization** — browser uploads over ~700 KB are capped at
  1920px and re-encoded (JPEG q85 for opaque images, PNG kept for
  transparent logos), typically 5–10× smaller.
- **Render containment** — cards/rows use `content-visibility: auto`
  (`.pg-cv`) so off-screen items skip layout/paint; asset lookups in the
  prompt library go through one memoized id→asset map.

## Agent API + MCP 🤖

External AI tools connect **into** PostGen and draft posts (drafts-only — you approve/publish).

- **Copy for your agent (Settings → AI)** — one click creates a fresh API key
  (`Agent (one-paste)`) and copies a ready-made brief to paste into any agent
  chat: the MCP link + REST/OpenAPI URLs, the key, all 12 tools, and the rules
  (drafts-only, no-repeat, brand voice/blacklist, official links only). The agent
  connects, lists your projects, and waits — no explaining PostGen in chat. The
  pack text lives in `src/features/agents/agentSetup.ts`; re-copying reuses the
  same key, “Make a new one” mints another. Existing keys can never be embedded
  (only their hash is stored), which is why the pack always uses a fresh key.
- **REST**: `https://postgen.pages.dev/api/v1` — OpenAPI 3.1 spec at the same URL.
  Auth: `Authorization: Bearer pgk_live_…` (create keys in **Settings → AI connections**).
- **MCP** (Streamable HTTP): `https://postgen.pages.dev/api/mcp` — 12 tools:
  `list_projects` (lite: name/@handle/count), `get_project` (full profile +
  `brand_logo` + `char_limit`), `list_posts`, `create_draft`, `update_draft`,
  `append_to_thread`, `find_similar`, `list_assets`, `list_image_prompts`
  (`?project_id` filter), `create_image_prompt`, `update_image_prompt`,
  `delete_image_prompt` + `project://…` resources.
  Claude Desktop / Claude Code:
  `npx mcp-remote https://postgen.pages.dev/api/mcp --header "Authorization: Bearer pgk_live_…"`
- **Guardrails** (every write, web + agents): drafts-only for agents, the no-repeat
  check (409 unless `"allow_similar": true`), 250 req/min & 50 posts/day per key,
  full `agent_activity` log. Prompt-library writes validate `reference_asset_ids`
  against the caller's **own** assets, cap the prompt at 4000 chars and notes at 1000.
- **Update is a whole-object write** — `PATCH /api/v1/prompts/:id` and
  `update_image_prompt` overwrite every field, so send the complete object.

### The agent batch flow (“make 10 posts for X”)

`list_projects` is lite on purpose — the agent loads ONE project with
`get_project`, which returns `brand_logo` (assets of kind `logo_full` /
`logo_icon` / `logo_transparent_name`, uploaded from the three labelled slots
in the project form; the generated-image default is the transparent-with-name
logo) and `char_limit`: **25,000** for every account (the old free/Premium 280 split was removed — there is no Premium toggle anymore)
(every account gets the 25,000 cap in the agent lint and the web composer
counter alike; the retired `profiles/projects.x_premium` columns are kept
only for backward compatibility and no longer drive anything). Image prompts can be tagged to projects
(`image_prompts.project_ids`, chips in the prompt composer; empty = global) —
`list_image_prompts` with a project returns that project's prompts first, then
globals, and excludes other projects' prompts. The paste-pack teaches the
whole loop: plan distinct angles → lint (limit, blacklist, repeats incl.
intra-batch) → save text drafts → pick a tagged prompt (shuffle, no repeats)
→ generate + visually verify the image → upload via
`POST /api/v1/assets/upload` → attach to the draft. In the editor, **Post on
X** now asks “Did you post it?” — Yes moves the post to Published
(`published_at` stamped); Not yet leaves it Approved.

### REST endpoints

```
GET    /api/v1/projects                    list my projects
POST   /api/v1/projects                    create a project
GET    /api/v1/projects/:id                project + brand voice + profile
PATCH  /api/v1/projects/:id                update project / profile fields
GET    /api/v1/projects/:id/knowledge      knowledge & sources
GET    /api/v1/posts                       ?project_id&status&category&type&tag&q
GET    /api/v1/posts/:id                   post + tweets + media
POST   /api/v1/posts/:id/tweets            append one tweet
GET    /api/v1/assets                      my media (signed URLs on read)
GET    /api/v1/prompts                     my prompt library
POST   /api/v1/prompts                     create a prompt
GET    /api/v1/prompts/:id                 one prompt
PATCH  /api/v1/prompts/:id                 update (whole object)
DELETE /api/v1/prompts/:id                 delete
```

Posts writes (`POST /api/v1/posts`, `PUT /api/v1/posts/:id/tweets`,
`POST /api/v1/posts/:id/tweets`) are **hard-capped to `idea`/`draft`** — approving,
scheduling and publishing stay human-only in the web app (403 otherwise).

## Accounts 👥

One live Supabase session per device, but **Settings → Accounts** (top of
Settings) keeps every added account's refresh token in `localStorage`
(`postgen.accounts.v1`, max 8, this device only) so users can jump
between accounts with one tap — no password re-entry. "Add another
account" signs the new account in through a throwaway non-persisted
client (the live session is never disturbed; the fresh client is never
signed out, which would revoke the stored token). Switching uses
`auth.setSession` and reloads into that account's dashboard; signing
out forgets that account (its token is revoked anyway). Switching to
an account whose token died drops the entry with a clear message.

## Sharing (send → accept) ✉️

Users can send a **project**, a **post**, or an **image prompt** to another
PostGen user (Send buttons on each, plus the compose form on the Shares
page). Recipients are found by account email
(`find_recipient_by_email`); the share stores a frozen payload snapshot, so
the recipient gets exactly what was sent. Nothing appears in the
recipient's account until they **accept** from **Shares → Received**
(dashboard card shows the pending count): accepting imports their own
independent copy — a project arrives with only its profile/brand +
knowledge (never its posts or media; posts travel only when sent as
posts, with their media), a post lands in a project they choose (or a
new one), a prompt joins
their library (reference images stay with the sender). Declining,
cancelling and clearing are all in Shares → Sent/Received. Schema:
`supabase/migrations/20261016000001_sharing.sql` (`shares` table, RLS:
only sender + recipient can see a share).

**No duplicates:** `share_imports` (migration
`20261016000005_share_imports.sql`) remembers, per recipient, which
local copy came from which sender item. Re-sending the same
project/post/prompt and accepting again **updates that copy in
place** — project profile/brand/knowledge/logos refresh (the
recipient's posts are never touched), a post's content/media refresh
(its local status is preserved), a prompt's text refreshes. The
Received card flags these as **↻ Updated version** with an **Update
my copy** button, and posts from one source project always land in
ONE local project, never one project per post. Re-sending also
supersedes a still-pending earlier send of the same item, so the
recipient sees one pending share per item, at its newest version.
Project identity also matches across doors: post payloads carry the
source project's slug + @handle, post-accept links that source
project to the local one, and project-accept **adopts** an existing
project on a slug OR @handle match — so accepting a post first and
the project later (or vice versa) still converges on ONE project.

## Keyboard shortcuts & autosave ⌨️

- **⌘K / Ctrl+K** — quick switcher (jump to projects, posts, pages)
- **⌘S / Ctrl+S** — save post (runs the no-repeat gate)
- **Esc** — close dialogs (duplicates, media picker, palette)
- Drafts **autosave** 2s after you stop typing; if a draft drifts into repeat
  territory a non-blocking banner warns you (explicit save still blocks repeats)
- **Export/Import** per project: Markdown or JSON out, JSON back in (exact
  duplicates skipped on import)
- **Appearance** (Settings): 4 accent themes

## Project profile 🪪

Every project carries a full brand profile (created in the New project form —
logo & assets upload is the first section of the form):

- **Logo** + **asset gallery** (mascot, product shots…) — each asset gets a kind label;
  one image is the project logo (dashboard + previews)
- **Name · Description/Context · X username · website**
- **Content pillars** — the recurring topics you post about
- **Sample posts you love** — few-shot style examples for the AI
- **Tone & voice**
- **Blacklist words/symbols** — see below
- **Custom instructions** — anything else the AI must know
- **Official links** (Discord, Telegram, GitHub, …) — agents cite these and never invent links

The whole profile is served to connected AIs via `GET /api/v1/projects/:id` and the MCP
resource `project://<id>/context`, so every external agent drafts with full brand context.

**Display order:** users can arrange their projects in any order in
**Settings → Projects** (up/down arrows). The order (`projects.sort_order`,
migration `20261016000007_project_sort_order.sql`; lower first, backfilled
to preserve the previous newest-first order) is applied in the shared
`useProjects` hook, so dashboard grids, pickers and lists all follow it.
New projects append at the end; unordered rows (e.g. freshly imported)
sort last.

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

## Blacklist 🚫

Per-project **blacklist words/symbols** (part of the brand profile):

- **Agent writes are hard-blocked** — a draft containing a blacklisted term is
  rejected with `403 {"error":"blacklisted","hits":[…]}` (REST and MCP).
- **Web editor warns, never blocks** — you're the human, so you can override.
- Words match at word boundaries (`gm` matches `gm!`, not `legma`); symbols match
  anywhere (`🚀`, `🔥🔥`). Case-insensitive.

---

## Roadmap

- **M0** ✅ scaffold, schema + RLS, dedupe engine, keep-alive, deploy config
- **M1** ✅ auth & projects (brand voice per project)
- **M2** ✅ posts CRUD, threads (n/n), X char counter, search, copy, no-repeat dialog
- **M3** ✅ R2 media upload + signed reads
- **M4** ✅ Agent API: REST + API keys + MCP + OpenAPI + drafts-only guardrails
- **M5** ✅ polish, ⌘K, export
- ✅ project profile (logo, links, chains, pillars, samples, blacklist, …)
- ✅ **prompt library** — shared image-prompt recipes with reference media,
  bento grid + detail sheet in the UI, full read/write over REST and MCP
- ✅ API keys **hard-delete** (row removed, not just revoked)

Full detail in [`PLAN.md`](./PLAN.md).

---

## Current state & known gaps

**Live:** <https://postgen.pages.dev> · `origin/main` deploys on every push ·
12 MCP tools · migrations auto-apply via the Supabase GitHub integration.

**All suites green** (`scripts/e2e.mjs` in-repo; the Playwright suites live in
`/home/user/shots/` and run against production):

| Suite | Covers |
|---|---|
| `scripts/e2e.mjs` | 44 checks — auth → web CRUD → dedupe → media → agent REST → MCP → revocation |
| `shots/promptcrud.mjs` | UI create → view → edit → delete through the real bento UI |
| `shots/agentwriteprompts.mjs` | agent create/update/delete over MCP **and** REST + guardrails + audit feed |
| `shots/v18.mjs`, `shots/xid.mjs` | post open/edit flow, X identity |

**Known gaps (not yet built):**

1. The agent **cannot remove a reference image** it no longer needs from a prompt
   — `create_image_prompt` / `update_image_prompt` accept `reference_asset_ids`, so
   it *can* replace the whole list, but there is no single-purpose "drop this one
   reference" tool, and no way to discover which reference is which without
   guessing an asset id.
2. The agent **cannot tell which prompt produced which past image** — reference
   thumbnails exist only in the UI. Nothing in the API returns the image that a
   prompt generated, so style provenance is human-readable only.
3. `agent_activity` has **no `metadata` column** — the audit feed stores
   `action` + `request` only. Don't select `metadata`.

**Leftover to clean up:** a probe API key `pgk_live_ou5jbw_…` still exists on the
`agent@postgen.com` account (Settings → AI connections → API keys → trash).
Delete it before handing the project on.
