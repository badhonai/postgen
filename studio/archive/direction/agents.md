# Agent Instructions

## Latest delivery — ACEPYR / THE GAP

New 54s / 1080p60 / 3240-frame voice-led film, using the exact supplied narration and logo, original 144 BPM music/dry accents, twelve illustrated scenes, Remotion and frame-driven Framer Motion.

- Film: `exports/acepyr-the-gap-54s.mp4`
- Editable source: `exports/acepyr-the-gap-source.zip` (53 entries; 52 hashed payloads; CRC verified).
- Captions, poster, X draft and review/reproduction notes: `exports/acepyr-*`.
- Source: `src/acepyr/index.tsx`; standalone guide: `acepyr-source-README.md`.
- Final checks: exact 54.000s video/audio/container, full decode, 88 exact encoded frames inspected, fresh/reverse seeks stable; −14.01 LUFS / −1.78 dBTP. Extracted-source seek smoke matches the workspace frame. This is not uninterrupted AV watching/listening or an independent human critique.
- Latest user corrections are delivered: ballots drop into the top slot with proper occlusion; no bottom black caption strip. Scene colour fills the frame, captions adapt for contrast, and content-only clipping keeps entering objects out of the caption area. Previous AAC packets and decoded 16-bit audio samples are unchanged.
- Official documentation says Belief Tokens are planned, not live; do not present the illustrative numbers as a live product/probability. Supplied recording filename labels Hope; exact Emma identity was not independently verified. No new TTS/API billing change after upload; never package/repeat the user's key.
- Earlier final exports, source ZIPs and original reference assets are preserved. For space, redundant legacy PCM is canonical in delivered source ZIPs and runtime-cached: run `python3 scripts/restore-archived-audio.py` before previewing/rendering older films (the redundant public WAV copies are archived). Some older tmp review images are archive-backed/regenerable: see `tmp/INTERMEDIATE-LOCATION.md` and `scripts/restore-archived-reviews.py`. Current Acepyr scripts bundle only their own public assets.


You are working in the `motion-graphics` repository. Your job is to create polished, intentional motion graphics while preserving the user's identity, voice, brand, and project context.

## Read these files first

Before doing project work, read:

1. `README.md` for repository conventions.
2. `setup.md` for the media toolchain and verification requirements.
3. `taste.md` for reference analysis and creative direction.

Do not assume tools are installed just because they are documented. Inspect the current environment and verify them.

## Toolchain responsibilities

Use the tools according to these roles:

- **Remotion:** Main programmatic video composition and rendering with React.
- **HyperFrames:** HTML/GSAP-based motion-graphics compositions, animation systems, and previews.
- **FFmpeg / FFprobe:** Cutting, transcoding, audio processing, media inspection, and final encoding.
- **Whisper:** Speech transcription and caption generation.
- **yt-dlp:** Downloading reference media only when the user is permitted to download it and platform terms allow it.

Choose the appropriate renderer for each job. Do not force both Remotion and HyperFrames into every project. Keep the source project editable and make the rendering pipeline reproducible.

## Setup and verification

When asked to set up the environment:

1. Follow `setup.md` from the repository root.
2. Install Node packages locally in this repository and Python packages inside `.venv/` where possible.
3. Install FFmpeg using an appropriate system package manager or approved local binary. Do not pretend FFmpeg is installed in the repository if it is a system dependency.
4. Run the CLI checks and actual smoke tests described in `setup.md`.
5. Report each tool as Pass, Fail, or Blocked. Never say all five work unless all five have passed real smoke tests.

Do not overwrite existing project configuration or package manifests without inspecting them first. Do not run a project scaffolder that rejects an existing Git repository at the repository root.

## Before creating a video

1. Inspect the repository and read the relevant project files.
2. Review `raw/` for source assets and `reference/` for creative references.
3. Follow `taste.md`: analyze pacing, captions, colour, motion, and sound before designing.
4. Preserve the user's facts, wording, voice, brand, and project identity. Never invent personal or project claims.
5. Confirm the intended platform, aspect ratio, resolution, frame rate, duration, and output format. If unspecified, use sensible defaults and state them.
6. Create an original direction inspired by abstract reference principles, never a direct copy.

## Creative standards

- Build around a clear visual concept and hierarchy.
- Use deliberate typography, spacing, composition, colour, and contrast.
- Make animation purposeful. Use easing, anticipation, follow-through, and a consistent motion language.
- Keep transitions coherent. Avoid excessive effects, random gradients, generic templates, and visual clutter.
- Ensure text remains readable at the target display size.
- Respect supplied brand assets. Do not invent logos or alter provided assets without a clear reason.
- Prefer reusable components, design tokens, and animation helpers over duplicated one-off implementations.

## Implementation standards

- Choose Remotion or HyperFrames based on the project requirements; use both only when there is a clear integration reason.
- Use FFmpeg for media operations that are better handled outside the renderer.
- Keep source code and editable project files outside `exports/`.
- Use clear filenames and organize project-specific work into descriptive subdirectories without changing the required top-level structure.
- Avoid unnecessary dependencies. Explain significant new dependencies.
- Keep generated assets reproducible when practical.

## Rendering and quality assurance

Before delivering an export:

1. Run the project using its documented commands.
2. Check the composition at its target dimensions and aspect ratio.
3. Verify animation timing, easing, transitions, and loop behavior where applicable.
4. Check for clipping, overflow, font-loading issues, visual artifacts, and console errors.
5. Verify audio synchronization and levels when audio is present.
6. Render a preview, inspect it, fix issues, and render the final output.
7. Save deliverables in `exports/` with descriptive names.

Never claim that a render or test passed unless it was actually run and inspected.

## Git and asset handling

- Do not overwrite or delete original files in `raw/`.
- Do not commit secrets, credentials, private client data, virtual environments, dependency folders, caches, or unrelated files.
- Avoid committing huge reference downloads or rendered videos. Use Git LFS or external storage when appropriate.
- Keep commits focused and use clear commit messages.
- Update `README.md` when project structure, setup, or usage changes.

## Delivery notes

When a task is complete, summarize what was created, where the source files and exports are located, how to run or render the work, and what verification was performed. Clearly identify anything that remains unverified.

## Current research-to-production gate

Motion-design research is collected at `exports/motion-design-research.md`; source index and next-turn handoff are under `reference/research/opus55-2026-11-09/`. The user authorized research only for this turn. Wait for the user's later **continue** before creating the next composition, score or render. Continue through Arena without paid Claude access. Explicitly read the four `.agents/skills/arena-*/SKILL.md` project adapters when that revision is authorized; do not bulk-enable or execute unreviewed upstream material.

## Gate resolved / latest output

The user subsequently said “Continue”, authorizing the fresh MAKE / BREAK / BECOME reel. It is completed at `exports/make-break-become-15s.mp4`, with source under `src/become/` and detailed review/reproduction notes in `exports/make-break-become-build-notes.md`. Preserve this and prior films. The earlier research-only gate is historical, not an instruction to ignore that later authorization.


## Fluton intent film — 9 November 2026
The user approved MAKE / BREAK / BECOME and requested a Fluton-branded film. New independent 15s/1080p60 composition: `src/fluton-intent/index.tsx`; concept “Your intent. Not your data.” Exact supplied logos, green/blue palette, original 128 BPM score. Deliverables: `exports/fluton-intent-15s.mp4`, `fluton-intent-source.zip`, `fluton-intent-build-notes.md`, `fluton-intent-poster.jpg`. Source / seek / encoded QA: `tmp/fluton-intent/`. Heavy regenerable bundles and picture master are excluded-cache files under `.cache/fluton-intent/`. Earlier work preserved. Final encoded-frame inspection is not uninterrupted audiovisual listening/playback.


## Fluton black edition — revision delivered
User requested 30–45s, black theme, stronger visuals and removal of hissing transition sweeps while retaining the BGM. New independent `src/fluton-black/index.tsx`: 37.5s, 1080p60/2250 frames, black throughout, exact supplied logos, continuous projected-mark/docking sequence. Twenty-bar 128 BPM extension of prior musical motif; no noise sweeps or random-noise synthesis. Exports: `fluton-black-37.5s.mp4`, `fluton-black-source.zip`, `fluton-black-build-notes.md`, `fluton-black-poster.jpg`. Source/encoded QA: `tmp/fluton-black/`; 60 exact decoded frames inspected, not uninterrupted audiovisual playback/listening. Render/QA explicitly use swangle after default-backend edge variations. Earlier exports preserved.
