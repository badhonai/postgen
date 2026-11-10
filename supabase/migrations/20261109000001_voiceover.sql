-- ============================================================
-- PostGen — 20261109000001_voiceover.sql
-- Secure BYO voice provider (ElevenLabs) + voiceover generation log.
--
-- The provider key is NEVER stored in plaintext and never leaves the server:
--   * the browser sends it once to /api/voice/settings (Supabase JWT)
--   * the Pages Function encrypts it with AES-256-GCM using a key derived
--     (HKDF-SHA256) from a server-only secret + the user id
--   * only the ciphertext reaches Postgres, and only the service role can
--     decrypt it (the web app has no read policy on the cipher column)
-- ============================================================

create table if not exists public.voice_settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  provider       text not null default 'elevenlabs',
  voice_id       text not null,
  voice_name     text,
  key_cipher     text not null,
  daily_limit    int not null default 20 check (daily_limit between 1 and 500),
  per_script_limit int not null default 2 check (per_script_limit between 1 and 50),
  last_tested_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.voice_generations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  api_key_id          uuid references public.api_keys (id) on delete set null,
  script_hash         text not null,
  characters          int not null default 0,
  asset_id            uuid references public.assets (id) on delete set null,
  provider_request_id text,
  alignment           jsonb,
  status              text not null default 'ok' check (status in ('ok', 'error')),
  error               text,
  created_at          timestamptz not null default now()
);
create index if not exists voice_generations_user_idx
  on public.voice_generations (user_id, created_at desc);
create index if not exists voice_generations_script_idx
  on public.voice_generations (user_id, script_hash, created_at desc);

alter table public.voice_settings    enable row level security;
alter table public.voice_generations enable row level security;

-- The owner may read status fields (never the key: it is ciphertext and the
-- web client has no business with it, so the cipher column is withheld by a view).
revoke all on public.voice_settings from anon;
revoke all on public.voice_generations from anon;

create policy "voice_settings_own_select" on public.voice_settings
  for select using (auth.uid() = user_id);

create policy "voice_generations_own_select" on public.voice_generations
  for select using (auth.uid() = user_id);

-- No insert/update/delete policies: only the service role (Pages Functions) writes.

create or replace view public.voice_status
with (security_invoker = true) as
  select user_id, provider, voice_id, voice_name, daily_limit, per_script_limit,
         last_tested_at, created_at, updated_at
  from public.voice_settings;

grant select on public.voice_status to authenticated;
