-- User-chosen project display order (Settings → Projects → order).
-- Lower shows first. Existing rows are backfilled so the current
-- visual order (newest first) is preserved exactly.
alter table public.projects
  add column if not exists sort_order integer;

with ranked as (
  select
    id,
    (row_number() over (partition by user_id order by created_at desc) - 1)::integer as rn
  from public.projects
  where sort_order is null
)
update public.projects p
set sort_order = r.rn
from ranked r
where r.id = p.id;
