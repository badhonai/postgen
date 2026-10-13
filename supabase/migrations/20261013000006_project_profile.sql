-- ============================================================
-- PostGen — 20261013000006_project_profile.sql
-- Rich project creation: logo, X username, official links +
-- contract addresses, chain/ticker, content pillars, sample
-- posts, custom instructions — plus asset kinds and a proper
-- "blacklist" key in brand_voice (replacing tabooWords).
-- ============================================================

-- ---------- projects: identity & links ----------
alter table public.projects
  add column if not exists x_username text,
  add column if not exists website_url text,
  add column if not exists chains text[] not null default '{}',
  add column if not exists token_ticker text,
  add column if not exists content_pillars text[] not null default '{}',
  add column if not exists sample_posts text[] not null default '{}',
  add column if not exists custom_instructions text,
  add column if not exists official_links jsonb not null default '[]'::jsonb,
  add column if not exists contract_addresses jsonb not null default '[]'::jsonb,
  add column if not exists logo_asset_id uuid references public.assets (id) on delete set null;

-- ---------- assets: role labels (logo, mascot, product, …) ----------
alter table public.assets
  add column if not exists kind text not null default 'other';

-- ---------- brand_voice: tabooWords → blacklist ----------
update public.projects
set brand_voice =
  (brand_voice - 'tabooWords')
  || jsonb_build_object('blacklist', coalesce(brand_voice->'tabooWords', '[]'::jsonb))
where brand_voice ? 'tabooWords';

comment on column public.projects.official_links is
  'JSON array of {label, url} — website, Discord, Telegram, GitHub, …';
comment on column public.projects.contract_addresses is
  'JSON array of {chain, address, label} — official token/contract addresses';
comment on column public.projects.logo_asset_id is
  'Primary logo asset (FK → assets). Assets can also carry a free-text kind.';
