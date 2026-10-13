-- ============================================================
-- PostGen — 20261013000001_post_saver.sql
-- Atomic save of a post + its thread tweets + tags.
-- Used by the web editor (M2) and later the agent API (M4).
-- Security invoker: RLS applies; auth.uid() must be present.
-- ============================================================

create or replace function public.save_post_with_tweets(
  p_post_id uuid default null,
  p_project_id uuid default null,
  p_category post_category default 'other',
  p_status post_status default 'draft',
  p_title text default '',
  p_content_text text default '',
  p_content_hash text default '',
  p_tweets text[] default '{}',
  p_tag_names text[] default '{}'
)
returns uuid
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_post_id uuid := p_post_id;
  v_tag text;
  v_tags text[] := coalesce(p_tag_names, '{}');
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if array_length(p_tweets, 1) is null then
    raise exception 'post must have at least one tweet';
  end if;

  if v_post_id is null then
    if p_project_id is null then
      raise exception 'project_id is required';
    end if;
    insert into public.posts
      (user_id, project_id, category, status, title, content_text, content_hash, published_at)
    values
      (v_user_id, p_project_id, p_category, p_status, p_title, p_content_text, p_content_hash,
       case when p_status = 'published' then now() else null end)
    returning id into v_post_id;
  else
    update public.posts
    set category = p_category,
        status = p_status,
        title = p_title,
        content_text = p_content_text,
        content_hash = p_content_hash,
        published_at = case
          when p_status = 'published' and published_at is null then now()
          when p_status <> 'published' then null
          else published_at
        end
    where id = v_post_id and user_id = v_user_id;
    if not found then
      raise exception 'post not found or not owned';
    end if;
  end if;

  -- thread: replace all tweets with the ordered array (positions 1..n)
  delete from public.post_tweets where post_id = v_post_id;
  insert into public.post_tweets (post_id, position, content)
  select v_post_id, ord, tw
  from unnest(p_tweets) with ordinality as t(tw, ord)
  where char_length(trim(tw)) > 0;

  -- tags: ensure rows exist, then sync links
  foreach v_tag in array v_tags loop
    if char_length(trim(v_tag)) > 0 then
      insert into public.tags (user_id, name)
      values (v_user_id, trim(v_tag))
      on conflict (user_id, name) do nothing;
    end if;
  end loop;

  delete from public.post_tags pt
  where pt.post_id = v_post_id
    and not exists (
      select 1 from public.tags t
      where t.id = pt.tag_id and t.name = any (v_tags)
    );

  insert into public.post_tags (post_id, tag_id)
  select v_post_id, t.id
  from public.tags t
  where t.user_id = v_user_id and t.name = any (v_tags)
  on conflict do nothing;

  return v_post_id;
end;
$$;

revoke execute on function public.save_post_with_tweets from anon;
grant execute on function public.save_post_with_tweets to authenticated;
