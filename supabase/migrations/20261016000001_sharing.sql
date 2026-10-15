-- ============================================================
-- PostGen — 20261016000001_sharing.sql
-- User-to-user sharing with an accept step.
--
-- A user "sends" a project, a post, or an image prompt to another
-- PostGen user (found by account email). The share carries a frozen
-- payload snapshot of the item, so what the recipient accepts is
-- exactly what was sent — even if the sender edits or deletes the
-- original afterwards. Nothing appears in the recipient's account
-- until they accept; accepting imports an independent copy owned
-- by them (their own projects / posts / prompts lists).
--
-- Media: imported copies get their own `assets` rows pointing at
-- the same R2 object, so `assets.r2_key` can no longer be globally
-- unique. The media sign endpoint additionally honours owning an
-- assets row for a key (see functions/api/media/sign.ts).
-- ============================================================

-- ---------- profiles: email for recipient lookup ----------
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create index if not exists profiles_email_lower_idx on public.profiles (lower(email));

-- keep the signup trigger copying the email too
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'user'
    ),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- Exact-email recipient lookup. Profiles stay owner-only under RLS;
-- this definer function returns just id + display name for an exact
-- match (never a list, never callable by anonymous users).
create or replace function public.find_recipient_by_email(p_email text)
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name
  from public.profiles p
  where lower(p.email) = lower(trim(coalesce(p_email, '')))
    and p.id <> auth.uid()
  limit 1;
$$;

revoke execute on function public.find_recipient_by_email(text) from anon, public;
grant execute on function public.find_recipient_by_email(text) to authenticated;

-- ---------- assets: shared media rows may reuse an r2_key ----------
alter table public.assets drop constraint if exists assets_r2_key_key;
create index if not exists assets_r2_key_idx on public.assets (r2_key);

-- ---------- shares ----------
create type share_item_type as enum ('project', 'post', 'prompt');
create type share_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  item_type share_item_type not null,
  -- the original item's id (informational; the payload is the source of truth)
  item_id uuid not null,
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  message text not null default '',
  status share_status not null default 'pending',
  -- set on accept: ids of the imported copy, e.g. {"projectId": "…"}
  result jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id)
);

create index shares_recipient_idx on public.shares (recipient_id, status, created_at desc);
create index shares_sender_idx on public.shares (sender_id, created_at desc);

alter table public.shares enable row level security;

-- both sides can see a share; only the sender can create one
create policy "shares_parties_select" on public.shares
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "shares_sender_insert" on public.shares
  for insert with check (sender_id = auth.uid());

-- recipient responds (accept/decline), sender cancels
create policy "shares_recipient_update" on public.shares
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "shares_sender_update" on public.shares
  for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create policy "shares_parties_delete" on public.shares
  for delete using (sender_id = auth.uid() or recipient_id = auth.uid());
