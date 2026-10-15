-- ============================================================
-- PostGen — 20261016000005_share_imports.sql
-- No duplicates from sharing: remember what each recipient
-- imported from each sender, so accepting the same project /
-- post / prompt again UPDATES the existing copy in place
-- instead of creating a second (third, fourth…) one.
--
-- Keyed by the SOURCE identity (sender + item_type + the id of
-- the item in the sender's account — shares.item_id), pointing
-- at the recipient's local copy. Post rows also remember the
-- local project the post landed in, keyed by the SOURCE
-- project, so accepting several posts from one source project
-- reuses one local project instead of creating one per post.
-- ============================================================

create table public.share_imports (
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  item_type share_item_type not null,
  -- id of the item in the SENDER's account (shares.item_id)
  source_item_id uuid not null,
  -- for posts: id of the sender's project the post belongs to
  source_project_id uuid,
  -- recipient's local copy
  local_id uuid not null,
  -- for posts: recipient's local project containing the copy
  local_project_id uuid,
  -- sender-side updated_at captured when the share was sent
  source_updated_at timestamptz,
  last_share_id uuid references public.shares (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipient_id, sender_id, item_type, source_item_id)
);

create index share_imports_source_project_idx
  on public.share_imports (recipient_id, sender_id, source_project_id);

alter table public.share_imports enable row level security;

create policy "share_imports_own_all" on public.share_imports
  for all using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
