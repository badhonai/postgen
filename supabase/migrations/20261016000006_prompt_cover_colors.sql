-- ============================================================
-- PostGen — 20261016000006_prompt_cover_colors.sql
-- Image prompt refinements:
--
-- 1. Reference images are a COVER — they show how the output
--    of this prompt looks. They must NOT be fed to an image
--    model as generation references unless the owner turns
--    that on per prompt: `use_reference_images` (default off).
--    (The agent API enforces this: cover images are always
--    returned as cover_assets, but only appear in
--    reference_assets when the flag is on.)
--
-- 2. `color_codes`: an optional palette of hex colors the
--    image should use, set by the owner (empty = no palette).
-- ============================================================

alter table public.image_prompts
  add column if not exists use_reference_images boolean not null default false,
  add column if not exists color_codes text[] not null default '{}';
