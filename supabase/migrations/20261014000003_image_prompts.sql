-- ============================================================
-- PostGen — 20261014000003_image_prompts.sql
-- Saved image prompts, shared across all of the user's projects.
--
-- An image prompt is a reusable recipe for generating art: the prompt
-- text itself, a note about what output it tends to produce, and a set
-- of reference images that show the style. The agent API hands both the
-- text and the reference images (with short-lived signed URLs) to an
-- external AI so it can match the look, not just the words.
--
-- Prompts are deliberately user-scoped, not project-scoped: visual
-- style usually carries across ventures, and the agent reads them
-- without needing to know which project it is drafting for.
-- ============================================================

create table public.image_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  prompt text not null,
  notes text not null default '',
  -- ordered list of assets that show the style this prompt produces
  reference_asset_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index image_prompts_user_idx on public.image_prompts (user_id, created_at desc);

alter table public.image_prompts enable row level security;

create policy "image_prompts_own_all" on public.image_prompts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.image_prompts
  for each row execute function public.set_updated_at();
