-- ============================================================
-- PostGen — 20261110000002_studio_job_file_kinds.sql
--
-- A job folder holds the handoff *and* what the specialist sent back, and those
-- trees overlap by design (src/scenes/Exposure.tsx exists in both). Keying files
-- by (job_id, path) alone made the returned copy overwrite the handoff copy, so
-- the frozen baseline could vanish. Key by (job_id, path, kind) instead: both
-- stay, and `claim` still reads only kind = 'return'.
-- ============================================================

drop index if exists public.studio_job_files_path_idx;

create unique index studio_job_files_path_kind_idx
  on public.studio_job_files (job_id, path, kind);
