-- ============================================================
-- PostGen — 20261016000004_user_x_premium.sql
-- X Premium is a property of the USER's X account, not of each
-- project. It now lives on profiles (default: ON) and is edited
-- once in Settings; every project the user owns follows it.
--
-- projects.x_premium stays as a synced mirror so existing
-- readers (composer limit, agent char lint) keep working:
--  - new projects inherit the owner's profile setting
--  - changing the profile setting rewrites all their projects
-- ============================================================

alter table public.profiles
  add column if not exists x_premium boolean not null default true;

-- Default is Premium ON for everyone.
update public.profiles set x_premium = true;

-- Mirror onto existing projects.
update public.projects pr
set x_premium = coalesce(
  (select pf.x_premium from public.profiles pf where pf.id = pr.user_id),
  true
);

-- New projects inherit the owner's setting.
create or replace function public.set_project_x_premium_from_profile()
returns trigger
language plpgsql
as $$
declare
  v boolean;
begin
  select x_premium into v from public.profiles where id = new.user_id;
  new.x_premium := coalesce(v, true);
  return new;
end;
$$;

drop trigger if exists projects_x_premium_from_profile on public.projects;
create trigger projects_x_premium_from_profile
  before insert on public.projects
  for each row execute function public.set_project_x_premium_from_profile();

-- Toggling the user setting rewrites every project they own.
create or replace function public.sync_projects_x_premium()
returns trigger
language plpgsql
as $$
begin
  if new.x_premium is distinct from old.x_premium then
    update public.projects set x_premium = new.x_premium where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_x_premium_sync on public.profiles;
create trigger profiles_x_premium_sync
  after update of x_premium on public.profiles
  for each row execute function public.sync_projects_x_premium();
