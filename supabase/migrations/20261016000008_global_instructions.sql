-- Account-wide writing instructions (Settings → Global instructions).
-- Applied to every project the user owns; each project's own
-- custom_instructions add project-specific rules on top. Served to
-- agents inside get_project as `global_instructions`.
alter table public.profiles
  add column if not exists global_instructions text;
