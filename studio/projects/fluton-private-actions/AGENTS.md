# This run uses a visual-specialist handoff

The user has selected optional split mode for this project only. This is not the default for every future project.

**Orchestrator (Arena assistant):** facts, story, script, timeline, supplied assets, caption infrastructure, sound, narration decisions, rendering, QA, correction requests, final packaging.
**Visual specialist (Claude for this run):** art direction implementation, spatial design, illustrated scenes, frame-derived visual motion and reusable scene components.

## Minimal context, one focused pass
Read root AGENTS.md, this file, CLAUDE-HANDOFF.md, src/film-data.json and src/Film.tsx. Inspect the small brand files only as needed. Import brand.ts; don't fetch/recreate logos. The handoff repeats the necessary frame-clock rules. Do not read every research repo, old film, skill or archived workspace; do not redo story/concepts/research already prepared here.

Editable: src/Film.tsx, new src/scenes/**, new src/components/**, new src/visual-system.ts, VISUAL-RETURN.md.
Locked: project.json, assets.json, brand/**, src/film-data.json, src/index.tsx, src/Composition.tsx, src/CaptionOverlay.tsx, src/fonts.ts, src/brand.ts, src/timeline.ts, production/**, brief/storyboard/handoff, all repository-level files/dependencies/tooling.

No audio generation, ASR, paid APIs, full renders, frame-board generation or publishing. Typecheck and this project's bundle are enough for the specialist handback. Never claim render/visual review that did not run. If a locked item genuinely blocks implementation, report the smallest proposed change rather than silently modifying it.

Work on a new visual/fluton-private-actions branch, not directly on main. Return a PR/branch/commit the orchestrator can inspect. If GitHub write tools are unavailable, return a unified patch and say it was not committed. No token sharing is needed in chat.
