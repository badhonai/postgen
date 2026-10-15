-- ============================================================
-- PostGen — 20261016000003_project_share_logos.sql
-- Logos are part of a project's identity, so they travel with a
-- project share again (all logo variants + the primary). Posts
-- and other media still never do. The payload guard now strips
-- ONLY `posts`, and pending project shares get their logos
-- backfilled from the source project so they can be accepted
-- with logos included.
-- ============================================================

create or replace function public.sanitize_project_share_payload()
returns trigger
language plpgsql
as $$
begin
  if new.item_type = 'project' then
    -- the one hard rule: no posts in a project share, ever
    new.payload := coalesce(new.payload, '{}'::jsonb) - 'posts';
  end if;
  return new;
end;
$$;

-- Backfill logos into pending project shares from the source project.
update public.shares sh
set payload = jsonb_set(
  jsonb_set(
    sh.payload,
    '{project,logos}',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'r2_key', a.r2_key,
        'filename', a.filename,
        'mime_type', a.mime_type,
        'size_bytes', a.size_bytes,
        'width', a.width,
        'height', a.height,
        'alt_text', a.alt_text,
        'kind', a.kind
      ) order by a.created_at)
      from public.assets a
      where a.project_id = sh.item_id
        and a.kind in ('logo', 'logo_full', 'logo_icon', 'logo_transparent_name')
    ), '[]'::jsonb),
    true
  ),
  '{project,logo_r2_key}',
  coalesce((
    select to_jsonb(a.r2_key)
    from public.projects pr
    join public.assets a on a.id = pr.logo_asset_id
    where pr.id = sh.item_id
  ), 'null'::jsonb),
  true
)
where sh.item_type = 'project' and sh.status = 'pending';
