-- ============================================================
-- PostGen — 20261015000001_agent_flow.sql
-- The agent batch flow (paste block → "make 10 posts for X"):
--
-- 1. projects.x_premium — the project's X account has Premium.
--    Premium accounts can post long-form (up to 25,000 chars);
--    free accounts are capped at 280 weighted chars. The web
--    composer counter and every agent lint read this flag.
--
-- 2. image_prompts.project_ids — which projects a prompt is for.
--    Empty array = global (usable for any project). A prompt can
--    carry several projects and a project can have many prompts;
--    the agent only receives prompts tagged for its project
--    (plus globals) when it asks with a project filter.
--
-- Logo variants need NO column: they are assets with kind
-- logo_full | logo_icon | logo_transparent_name (see ASSET_KINDS),
-- uploaded from the three labelled slots in the project form.
-- ============================================================

alter table public.projects
  add column if not exists x_premium boolean not null default false;

alter table public.image_prompts
  add column if not exists project_ids uuid[] not null default '{}';
