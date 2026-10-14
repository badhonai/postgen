-- ============================================================
-- PostGen — 20261014000001_dedupe_exclude_self.sql
-- BUG FIX (found by the full-site walkthrough): saving an EDIT of an
-- existing post always tripped the no-repeat gate.
--
-- find_duplicate_post (exact content-hash lookup) had no way to exclude
-- the post being saved, so an edit matched ITSELF → the web editor showed
-- "Repeat post detected" and refused to save; the agent API returned 409
-- for the same reason. find_similar_posts already excluded the post;
-- only the exact-hash path was affected.
--
-- The helper gains an optional p_exclude_post_id (null = old behaviour,
-- so create/import callers are unchanged).
-- ============================================================

drop function if exists public.find_duplicate_post(text, uuid);

create or replace function public.find_duplicate_post(
  p_content_hash text,
  p_user_id uuid default null,
  p_exclude_post_id uuid default null
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
    and (p_exclude_post_id is null or id <> p_exclude_post_id)
  limit 1;
$$;

comment on function public.find_duplicate_post is
  'No-repeat posts: exact content-hash duplicate lookup, scoped to the caller (auth.uid(), or p_user_id for service_role). p_exclude_post_id lets an edit skip the post being saved.';
