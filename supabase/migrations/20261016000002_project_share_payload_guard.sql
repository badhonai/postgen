-- ============================================================
-- PostGen — 20261016000002_project_share_payload_guard.sql
-- Project shares must carry ONLY the project (profile/brand +
-- knowledge) — never posts or media. The web client already
-- builds project payloads that way, but a stale cached client
-- could still send (and accept) an old payload with posts baked
-- in. Enforce the rule at the database so it holds for every
-- client: strip `posts` (and the logo media) from project-share
-- payloads on the way in.
-- ============================================================

create or replace function public.sanitize_project_share_payload()
returns trigger
language plpgsql
as $$
begin
  if new.item_type = 'project' then
    new.payload := coalesce(new.payload, '{}'::jsonb) - 'posts';
    if (new.payload -> 'project') is not null then
      new.payload := jsonb_set(
        new.payload,
        '{project}',
        (new.payload -> 'project') - 'logo',
        true
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists shares_sanitize_project_payload on public.shares;
create trigger shares_sanitize_project_payload
  before insert or update of payload, item_type on public.shares
  for each row execute function public.sanitize_project_share_payload();

-- Clean up shares that already exist: pending ones lose their
-- posts/media now, so accepting them later can only ever import
-- the project shell.
update public.shares
set payload = (payload - 'posts')
where item_type = 'project' and payload ? 'posts';

update public.shares
set payload = jsonb_set(payload, '{project}', (payload -> 'project') - 'logo', true)
where item_type = 'project'
  and (payload -> 'project') is not null
  and (payload -> 'project') ? 'logo';
