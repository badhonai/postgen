-- ============================================================
-- PostGen — 20261013000005_dedupe_service_actor.sql
-- BUG FIX (found by scripts/e2e.mjs): the no-repeat helpers scope by
-- auth.uid(), which is NULL for service-role callers (agent API/MCP) —
-- so agent writes were never duplicate-checked.
--
-- Both helpers gain an optional p_user_id used ONLY when the caller is
-- service_role. Web callers keep passing nothing (auth.uid() applies).
-- ============================================================

drop function if exists public.find_duplicate_post(text);
drop function if exists public.find_similar_posts(text, uuid, uuid, float);

create or replace function public.find_duplicate_post(
  p_content_hash text,
  p_user_id uuid default null
)
returns uuid
language sql
stable
as $$
  select id
  from public.posts
  where user_id = coalesce(
    auth.uid(),
    case when coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role'
         then p_user_id end
  )
    and content_hash = p_content_hash
  limit 1;
$$;

create or replace function public.find_similar_posts(
  p_content_text text,
  p_exclude_post_id uuid default null,
  p_project_id uuid default null,
  p_threshold float default 0.4,
  p_user_id uuid default null
)
returns table (id uuid, title text, project_id uuid, similarity float)
language sql
stable
as $$
  select p.id,
         p.title,
         p.project_id,
         similarity(p.content_text, p_content_text) as similarity
  from public.posts p
  where p.user_id = coalesce(
    auth.uid(),
    case when coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role'
         then p_user_id end
  )
    and (p_exclude_post_id is null or p.id <> p_exclude_post_id)
    and (p_project_id is null or p.project_id = p_project_id)
    and similarity(p.content_text, p_content_text) >= p_threshold
  order by similarity desc
  limit 10;
$$;

comment on function public.find_similar_posts is
  'No-repeat posts: pg_trgm similarity search over normalized post text, scoped to the caller (auth.uid(), or p_user_id for service_role).';
