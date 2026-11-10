# Motion Graphics

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


A workspace for creating original, high-quality motion graphics with AI coding agents.

## Toolchain

- **Remotion:** Build and render programmatic videos with React.
- **HyperFrames:** Create HTML/GSAP-based motion-graphics compositions.
- **FFmpeg / FFprobe:** Cut, process, inspect, and export media.
- **OpenAI Whisper:** Transcribe speech and generate captions.
- **yt-dlp:** Download permitted reference media for analysis.

See [setup.md](setup.md) for installation and smoke tests. See [taste.md](taste.md) for reference analysis and creative standards. AI agents must follow [agents.md](agents.md).

## Project structure

```text
motion-graphics/
├── raw/          # Original footage, images, audio, fonts, and source assets
├── reference/    # Inspiration, examples, storyboards, and visual references
├── exports/      # Rendered previews and final deliverables
├── agents.md     # Instructions and workflow for AI agents
├── setup.md      # Toolchain installation and verification
├── taste.md      # Creative taste and reference-study rules
└── README.md     # Project overview and usage notes
```

## Folder conventions

### `raw/`
Keep original assets here. Preserve source filenames where practical. Do not overwrite originals. Organize larger collections into descriptive subfolders.

### `reference/`
Store inspiration, screenshots, storyboards, style frames, brand guidelines, and reference-analysis notes. Include source links or short notes when useful. Do not claim to have studied references that are not present or accessible.

### `exports/`
Store rendered previews and final deliverables. Use descriptive filenames that include the project or composition name and, when useful, a version number. Keep editable project files with their relevant project source rather than mixing them with final exports.

## Working principles

- Keep source assets separate from generated and exported files.
- Preserve the user's information, voice, brand, and project identity.
- Take inspiration from references without copying distinctive creative work.
- Prefer reusable components, clear naming, and maintainable project structure.
- Verify timing, typography, layout, audio, and render quality before calling an export final.
- Do not commit large generated renders, downloaded reference media, dependency folders, or caches unless explicitly required. Use Git LFS or external storage for large binary assets when appropriate.

## Fluton revised showreel (v2)

- Final video: `exports/fluton-showreel-v2-32s.mp4` (32s, 1920×1080, 60fps).
- Self-contained source: `fluton-showreel-v2.html` (`window.seek(t)`, embedded Inter fonts, user-supplied Fluton logos, embedded reference audio).
- Storyboard: `fluton-showreel-v2-storyboard.md`.
- Reference review and music provenance: `reference/analysis/fluton-v2-reference-review.md`.
- Editable animation source: `scripts/fluton-v2.js`; build with `python3 scripts/build-fluton-v2.py`.
- Renderer: `scripts/render-fluton-v2.cjs`; use `beats` to inspect beat frames and render the soundtrack WAV, then `render` for the full three-subframe 60fps encode.
- QA: `scripts/qa-fluton-v2.cjs` checks deterministic seeks and exact source-loop equality.

The revision uses the user's actual white logos and the soundtrack extracted from `reference/video.77d74909.mp4`. The privacy-pool interface is illustrative, not a screenshot or claim of a real transaction. The previous v1 is retained rather than overwritten.

## CONTROL / CHAOS — 15-second Remotion showcase

- Export: `exports/control-chaos-showreel-15s.mp4` (15s, 1920×1080, 60fps).
- Editable React composition: `src/showcase/Showreel.tsx`.
- Actual machine benchmark results: `exports/machine-comparison.md`.
- Source archive: `exports/control-chaos-project.zip`.
- Build details and verification: `exports/control-chaos-build-notes.md`.

Uses Remotion for timeline/rendering and Framer Motion's components/easing for deterministic frame-driven transforms. All dimensional surfaces and music are original and procedural. Run `node scripts/render-showcase.cjs beats` before `node scripts/render-showcase.cjs final`. The final pass requires system FFmpeg for loudness mastering and exact-duration trimming.

## Motion-design research and collected skills — 9 November 2026

Research for the next standalone 15-second showreel is saved; **do not create or render that revision until the user says “continue” in a later message**. Continue through Arena, not paid Claude model access.

- Main findings: [`exports/motion-design-research.md`](exports/motion-design-research.md)
- Portable source/skills collection: [`exports/motion-design-research-pack.zip`](exports/motion-design-research-pack.zip)
- Reference frame study: [`reference/analysis/opus55-reference-study-2026-11-09.md`](reference/analysis/opus55-reference-study-2026-11-09.md)
- Curated source index: [`reference/research/opus55-2026-11-09/skill-index.md`](reference/research/opus55-2026-11-09/skill-index.md)
- Next-turn handoff: [`reference/research/opus55-2026-11-09/NEXT-CONTINUE.md`](reference/research/opus55-2026-11-09/NEXT-CONTINUE.md)
- Four reviewed project adapters: `.agents/skills/arena-{motion-direction,motion-choreography,frame-safe-motion,motion-sound-qa}/SKILL.md`. Read explicitly; automatic skill discovery is not assumed.

Twelve repositories were pinned and selectively collected as inert references. No upstream install/plugin/script was executed. The pack retains 11 MIT collections with notices; official Remotion source text (license unclear in that repository) and creator media stay out of the portable archive. The source index records compatibility limits, rights, and review status. Frame-study sheets are not evidence of uninterrupted audiovisual playback.

## Fresh standalone reel — MAKE / BREAK / BECOME

The user authorized production with “Continue” on 9 November 2026. A new 15-second standalone reel is completed, separate from CONTROL / CHAOS and Fluton.

- Film: [`exports/make-break-become-15s.mp4`](exports/make-break-become-15s.mp4)
- Editable project: [`exports/make-break-become-source.zip`](exports/make-break-become-source.zip)
- Build / review evidence: [`exports/make-break-become-build-notes.md`](exports/make-break-become-build-notes.md)
- Direction: [`become-direction.md`](become-direction.md)
- Source: `src/become/`; assets / original audio: `public/become/`.
- Reproduction: prepare/score/render/QA/master/contact scripts named `*become*` in `scripts/`.

Verified exact 15.000000-second container/video/audio, 900 frames at 1920×1080/60 fps, BT.709 H.264, AAC stereo, full decode and sampled deterministic seeks. Visual review used source sheets and 40 encoded frame samples, not uninterrupted playback/listening. The film resolves intentionally rather than claiming a seamless loop.


## Fluton intent film — 9 November 2026
The user approved MAKE / BREAK / BECOME and requested a Fluton-branded film. New independent 15s/1080p60 composition: `src/fluton-intent/index.tsx`; concept “Your intent. Not your data.” Exact supplied logos, green/blue palette, original 128 BPM score. Deliverables: `exports/fluton-intent-15s.mp4`, `fluton-intent-source.zip`, `fluton-intent-build-notes.md`, `fluton-intent-poster.jpg`. Source / seek / encoded QA: `tmp/fluton-intent/`. Heavy regenerable bundles and picture master are excluded-cache files under `.cache/fluton-intent/`. Earlier work preserved. Final encoded-frame inspection is not uninterrupted audiovisual listening/playback.


## Fluton black edition — revision delivered
User requested 30–45s, black theme, stronger visuals and removal of hissing transition sweeps while retaining the BGM. New independent `src/fluton-black/index.tsx`: 37.5s, 1080p60/2250 frames, black throughout, exact supplied logos, continuous projected-mark/docking sequence. Twenty-bar 128 BPM extension of prior musical motif; no noise sweeps or random-noise synthesis. Exports: `fluton-black-37.5s.mp4`, `fluton-black-source.zip`, `fluton-black-build-notes.md`, `fluton-black-poster.jpg`. Source/encoded QA: `tmp/fluton-black/`; 60 exact decoded frames inspected, not uninterrupted audiovisual playback/listening. Render/QA explicitly use swangle after default-backend edge variations. Earlier exports preserved.
