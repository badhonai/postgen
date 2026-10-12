-- ============================================================
-- PostGen — 0001_init.sql
-- Schema, enums, RLS (per-user isolation), triggers.
-- Run in Supabase SQL editor, or `supabase db push`.
-- ============================================================

-- pg_trgm powers near-duplicate detection (0002_dedupe.sql).
-- Built into Postgres — free on Supabase free tier.
create extension if not exists pg_trgm;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'user'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- enums ----------
create type post_category as enum ('promotional', 'educational', 'announcement', 'other');
create type post_status as enum ('idea', 'draft', 'approved', 'scheduled', 'published', 'archived');
create type knowledge_kind as enum ('knowledge', 'source');
create type post_created_via as enum ('web', 'api', 'mcp');
create type agent_surface as enum ('rest', 'mcp');

-- ---------- projects ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  brand_voice jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
create index projects_user_idx on public.projects (user_id);

-- ---------- knowledge (per-project docs & sources) ----------
create table public.knowledge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind knowledge_kind not null default 'knowledge',
  title text not null default '',
  content text,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_user_project_idx on public.knowledge (user_id, project_id);

-- ---------- assets (R2 media metadata) ----------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  r2_key text not null unique,
  filename text not null default '',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  width int,
  height int,
  alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assets_user_project_idx on public.assets (user_id, project_id);

-- ---------- posts ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  category post_category not null default 'other',
  status post_status not null default 'idea',
  title text not null default '',
  created_via post_created_via not null default 'web',
  -- normalized thread text: powers no-repeat dedupe + full-text search
  content_text text not null default '',
  -- sha256(content_text): exact-duplicate lookup
  content_hash text not null default '',
  search_vector tsvector generated always as (to_tsvector('english', content_text)) stored,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_user_project_idx on public.posts (user_id, project_id);
create index posts_user_status_idx on public.posts (user_id, status);
create index posts_user_hash_idx on public.posts (user_id, content_hash);
create index posts_content_trgm_idx on public.posts using gin (content_text gin_trgm_ops);
create index posts_search_idx on public.posts using gin (search_vector);

-- ---------- post_tweets (thread rows, 1..n) ----------
create table public.post_tweets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  position int not null check (position >= 1),
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, position)
);
create index post_tweets_post_idx on public.post_tweets (post_id);

-- ---------- post_media (media attached per tweet in a thread) ----------
create table public.post_media (
  post_tweet_id uuid not null references public.post_tweets (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  position int not null default 1 check (position >= 1),
  primary key (post_tweet_id, asset_id)
);

-- ---------- tags ----------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

-- ---------- api_keys (for external AI agents: REST + MCP) ----------
-- Secret is shown once, stored as SHA-256 hash. Prefix is display-only.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  prefix text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_keys_user_idx on public.api_keys (user_id);

-- ---------- agent_activity (audit feed for every agent call) ----------
create table public.agent_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  api_key_id uuid references public.api_keys (id) on delete set null,
  surface agent_surface not null,
  action text not null,
  target_post_id uuid references public.posts (id) on delete set null,
  request jsonb,
  created_at timestamptz not null default now()
);
create index agent_activity_user_idx on public.agent_activity (user_id, created_at desc);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.knowledge
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.post_tweets
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security — every user sees ONLY their own rows.
-- Agents (REST/MCP) run under a minted user JWT, so these same
-- policies cover them. Service-role key bypasses RLS (server-only).
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.knowledge     enable row level security;
alter table public.assets        enable row level security;
alter table public.posts         enable row level security;
alter table public.post_tweets   enable row level security;
alter table public.post_media    enable row level security;
alter table public.tags          enable row level security;
alter table public.post_tags     enable row level security;
alter table public.api_keys      enable row level security;
alter table public.agent_activity enable row level security;

-- profiles: owner-only (keyed by id, not user_id)
create policy "profiles_own_select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_own_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- straightforward user-owned tables
create policy "projects_own_all" on public.projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "knowledge_own_all" on public.knowledge
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "assets_own_all" on public.assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "posts_own_all" on public.posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "tags_own_all" on public.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "api_keys_own_all" on public.api_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "agent_activity_own_all" on public.agent_activity
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- child tables: ownership flows through the parent post
create policy "post_tweets_own_all" on public.post_tweets
  for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

create policy "post_media_own_all" on public.post_media
  for all
  using (exists (
    select 1 from public.post_tweets t
    join public.posts p on p.id = t.post_id
    where t.id = post_tweet_id and p.user_id = auth.uid()))
  with check (exists (
    select 1 from public.post_tweets t
    join public.posts p on p.id = t.post_id
    where t.id = post_tweet_id and p.user_id = auth.uid()));

create policy "post_tags_own_all" on public.post_tags
  for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
