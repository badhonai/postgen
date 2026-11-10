# Start here — instructions for any coding assistant

> **Location:** this studio lives at `studio/` in the PostGen repo (`badhonai/postgen`).
> The standalone `motion-graphics` repo is retired — commit studio changes here.
> Cloudflare Pages builds only the app (`src/`, `functions/`); nothing under `studio/` ships.


This repository is an **AI-neutral motion-graphics studio**, not a gallery or a paid-agent subscription. Follow the user's current brief and your host's higher-priority policies. Tool names/capabilities vary: adapt these instructions, never fabricate tools, reviews or results.

## Flow selection
- **Narrated film** → follow `docs/FLOW.md` (voice first, then visuals, then PostGen delivery). Start with `docs/INTAKE.md`.
- **Silent/solo film** → the eight steps in `docs/WORKFLOW.md`.
- Never spend a paid voice generation before the script is final and the user has agreed to it.

## Optional role-split mode
Default is solo: the active assistant can own the whole film. If a project explicitly declares `workflowMode: visual-handoff`, read its AGENTS.md and CLAUDE-HANDOFF.md first. Those provide a compact frozen brief and a narrower edit scope. The visual specialist does NOT repeat story/research/audio/render/delivery work assigned to the orchestrator, and need not load every general document/skill unless blocked. See docs/DELEGATION.md. This mode is opt-in per project, not a requirement to use Claude on every film.

## Load in this order
1. `README.md` — commands and layout.
2. `docs/WORKFLOW.md` — brief → concept → design → motion → sound → review → delivery.
3. `docs/DESIGN.md` and the target project's `brief.md`, `storyboard.md`, `project.json`, `assets.json`.
4. Only the needed skills under `.agents/skills/` (see its README). These are plain-text playbooks; do not assume automatic agent discovery.
5. `docs/QA.md`, `docs/SECURITY.md`; consult `docs/research/` selectively, not all upstream sources at once.

## Scope and originality
- A request to organize, research or set up the repo does not authorize making a new film. A request to create a film does. No magic word such as “continue” is universally required.
- If platform, aspect ratio, message, duration or voice is consequentially unclear, ask focused questions. Otherwise do the work.
- Each new film needs a new idea and content-specific visual mechanism, not the previous film with different words/colors. The starter is an engineering fixture, not an approved art direction.
- Propose three genuinely different concepts; recommend one. Avoid repeated capability-demo sections, habitual wipes and effects without meaning.
- Preserve the user's facts, actual supplied logos and exact selected narration. Do not invent metrics, brand claims, voice identity or live product status. Check authoritative/current sources for consequential claims.
- Existing preferences: energetic when requested; diverse visual ideas; dry/tonal accents rather than hissing sweeps; full-bleed backgrounds rather than a persistent bottom black strip. These are defaults, not an override of a new brief.
- Do not change voice speed/pitch, replace a narrator, spend credits or call paid generation without explicit authorization. Never change billing or subscription settings.

## Implementation contract
- Remotion owns time. Every visible state is a function of frame + fixed props/assets/seed. Use `useCurrentFrame()` and named cues.
- Framer Motion components and pure easing may consume explicit frame-derived values with `initial={false}`. Do not use wall-clock `animate`, `exit`, `layout`, timers, autoplay CSS or rAF simulations for export.
- This is a test-required application pattern, **not an official Remotion/Framer Motion bridge**. Keep package pins/lockfile unless deliberately upgrading and retesting.
- Preload local fonts/assets. Keep required files in an asset manifest with rights and hashes. No hotlinked production assets, secrets or signed download URLs.
- Make contact geometry real: a ballot enters through the actual slot and is occluded at its plane; tokens do not float across unrelated headers. Check overlap, clips and local/global transforms.
- Removing a caption background must not expose off-screen animations: clip scene content separately, retain the full-bleed background, and adjust caption contrast.
- Optional true 3D/blur/audio tooling requires a scoped feasibility test, not an impressive-sounding claim.

## Quality and delivery
- Run environment inventory, tests/type/bundle checks, a small render, fresh/future/reverse seek checks, transition-neighborhood inspections, final metadata/decode and encoded audio measurement when audio exists.
- Inspect first/last frames, every handoff and important action contact. Do not judge only settled keyframes. Recheck adjacent frames after a fix.
- Technical QA is not aesthetic approval. Stills, automatic transcripts and waveform analysis are not uninterrupted AV viewing/listening or an independent critic. State what actually happened and what remains unverified.
- Keep prior work intact. New projects live in separate `projects/<slug>/` directories. Never overwrite another project's assets/output.
- This is a lightweight public repo: no raw media, reference downloads, final renders, source ZIPs, caches or account metadata in Git. See ignore rules and `npm run check`.
- Do not install all upstream skill packs, execute their scripts or start paid tools automatically. Retained notices and source links do not license linked media.
- Before delivery: list actual deliverables, reproduction commands, tests run, known limits and required human review. No “perfect” or “fully watched” claims without evidence.

## Ready-to-use user prompt
“Read AGENTS.md and follow docs/WORKFLOW.md. Create a new original motion-graphics project about [subject] for [audience/platform], [duration/aspect ratio]. Use [provided assets/voice]. Give me three distinct concepts, recommend one, then implement the approved direction with frame-safe motion and documented QA. No paid services unless I authorize them.”
