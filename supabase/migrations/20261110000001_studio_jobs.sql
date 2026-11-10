-- ============================================================
-- PostGen — 20261110000001_studio_jobs.sql
-- Studio jobs: the per-film folder that moves a video between the
-- orchestration agent and the visual specialist (Claude), without GitHub.
--
-- One job = one film being made. Its files live in R2 under
--   studio/<user_id>/<job_id>/<path>
-- and are listed/deleted from a dedicated "Studio" section in the app, so a
-- user can wipe the working files whenever they like — or keep them to edit
-- the video later. Jobs are kept separate from `assets` on purpose: assets are
-- post media, jobs are working files.
--
-- Auth: the job carries a scoped token (pgj_live_…). The hash is stored here;
-- the plaintext token is shown exactly once at creation and is handed to the
-- specialist inside the prompt. It can only touch this job's files.
-- ============================================================

create table public.studio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- the PostGen project this film belongs to (drafts get posted there)
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  slug text not null,
  -- open → returned → rendered → archived
  status text not null default 'open'
    check (status in ('open', 'returned', 'rendered', 'archived')),
  -- sha256 of the scoped job token; plaintext is never stored
  token_hash text not null,
  voice_id text,
  voice_name text,
  spec jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index studio_jobs_user_idx on public.studio_jobs (user_id, created_at desc);
create index studio_jobs_project_idx on public.studio_jobs (project_id);
create unique index studio_jobs_token_idx on public.studio_jobs (token_hash);

create table public.studio_job_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.studio_jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- relative path inside the job folder, e.g. src/scenes/Exposure.tsx
  path text not null,
  -- handoff (agent → specialist) | return (specialist → agent) | render | note
  kind text not null default 'handoff'
    check (kind in ('handoff', 'return', 'render', 'note')),
  filename text not null,
  mime_type text,
  size_bytes bigint,
  r2_key text not null,
  created_at timestamptz not null default now()
);

create index studio_job_files_job_idx on public.studio_job_files (job_id, path);
create unique index studio_job_files_path_idx on public.studio_job_files (job_id, path);

alter table public.studio_jobs enable row level security;
alter table public.studio_job_files enable row level security;

create policy "studio_jobs_own_all" on public.studio_jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "studio_job_files_own_all" on public.studio_job_files
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.studio_jobs
  for each row execute function public.set_updated_at();
