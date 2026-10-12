-- ============================================================
-- PostGen — 0002_dedupe.sql
-- "No repeat posts" — duplicate & near-duplicate detection.
--
-- How it works:
--   1. App-side normalization (see src/lib/text.ts, M2):
--      lowercase · strip thread numbering (1/n) · collapse whitespace
--      · replace URLs with <URL> · trim
--   2. content_hash = sha256(normalized text) → EXACT duplicates
--   3. pg_trgm similarity() on content_text → NEAR duplicates
--
-- These helpers run as the caller (security invoker), so RLS applies
-- and results are always scoped to auth.uid() — never cross-user.
-- ============================================================

-- Exact duplicate lookup. Returns the first matching post id, or null.
create or replace function public.find_duplicate_post(p_content_hash text)
returns uuid
language sql
stable
as $$
  select id
  from public.posts
  where user_id = auth.uid()
    and content_hash = p_content_hash
  limit 1;
$$;

-- Near-duplicate lookup (pg_trgm, 0..1 similarity).
-- p_threshold: callers use ~0.4 for "related" suggestions,
-- ~0.65 for the blocking "no repeat" check.
create or replace function public.find_similar_posts(
  p_content_text text,
  p_exclude_post_id uuid default null,
  p_project_id uuid default null,
  p_threshold float default 0.4
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
  where p.user_id = auth.uid()
    and (p_exclude_post_id is null or p.id <> p_exclude_post_id)
    and (p_project_id is null or p.project_id = p_project_id)
    and similarity(p.content_text, p_content_text) >= p_threshold
  order by similarity desc
  limit 10;
$$;

comment on function public.find_similar_posts is
  'No-repeat posts: pg_trgm similarity search over normalized post text, scoped to auth.uid().';
