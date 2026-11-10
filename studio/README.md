# PostGen Studio — motion graphics

> **This studio now lives inside the PostGen repo (`studio/`) and the standalone
> `badhonai/motion-graphics` repo is retired.** Nothing here is deployed by Cloudflare
> Pages; only `src/` and `functions/` are. Run studio commands from `studio/`
> (or `npm run studio:*` from the repo root) — the studio has its own `package.json`,
> so install it once with `npm run studio:install`.

**The flow is voice-first:** generate (or pick up) the voice, let it fix the timing,
then build the picture to the audio, render, master, upload as a PostGen asset and
attach it to a **draft post**. The finished deliverable is the post, never a zip.

**The handoff to the visual specialist happens through PostGen, not GitHub.** Each film gets a
*studio job* folder in the user's own account; Claude reads it and returns its scenes through a
job-scoped API token. Working files show up in **PostGen → Studio**, where they can be cleared at
any time — or kept to edit the video later.

- Paste-and-go agent prompt: [`docs/AGENT-PROMPT.md`](docs/AGENT-PROMPT.md)
- Pipeline: [`docs/FLOW.md`](docs/FLOW.md) · return contract: [`docs/DELEGATION.md`](docs/DELEGATION.md)
- App side: [`../README.md`](../README.md#studio--motion-graphics)

---

A lightweight, **AI-neutral** workspace for creating a different, original motion film each time. Built from the reference research and production lessons in this project—not a collection of giant videos or a one-style animation template.

**Any coding assistant:** start with [`AGENTS.md`](AGENTS.md). No Claude subscription, proprietary agent runtime or voice API is required.

## Reusable motion system

Every film in `projects/` is built from `studio/system/` (timing maths, tokens, bundled fonts,
word-level typography, printed primitives, the shared chrome) and one scaffold, `templates/film`.
A new motion graphic is a script plus one file per chapter:

```bash
node tools/film.mjs new my-film
# script -> voice -> production/scenes.json -> chapters -> stills -> score -> render -> master
```

Read [`docs/MOTION-SYSTEM.md`](docs/MOTION-SYSTEM.md) for the loop, the modules and the eight rules;
[`system/README.md`](system/README.md) for what each module owns.

## Quick start

Node 20.19+ (22 LTS recommended), npm, Git, FFmpeg/ffprobe and Chrome's Linux system libraries are required. See [setup](docs/SETUP.md).

```bash
npm ci
npx remotion browser ensure
npm run doctor
npm test
npm run typecheck
npm run build:check
npm run new -- my-film
# Fill projects/my-film/brief.md, storyboard.md and assets.json first.
npm run studio -- my-film
npm run still -- my-film --frame=120
npm run render -- my-film
npm run qa -- my-film
```

Studio opens on port 3000; use `--port=3001` for another project. Generated source is in `projects/my-film/`. Local output is in ignored `renders/my-film/`. Never run a second npm install inside each project.

### Small engineering smoke test

```bash
npm run render -- starter --frames=0-11 --scale=0.25
npm run qa -- starter --frames=0-11
```

This tests the pipeline, **not** a finished creative film. Full production still needs visual/audio review and a new concept.

## Repository map

```text
AGENTS.md                 Canonical instructions for any AI
CLAUDE.md / GEMINI.md      Thin pointers, not competing workflows
.agents/skills/            Four curated direction/choreography/engineering/sound-QA skills
docs/                     Setup, workflow, taste, QA, security and production lessons
  research/               Distilled findings, immutable source pointers and notices
templates/starter/        Small frame-clock/font/integration fixture + planning documents
projects/<slug>/           Your separately scoped film source and brief
tools/                    Generator, preview/render/QA, checks and optional audio master
tests/                    Built-in Node tests
public/fonts/             One small licensed shared font (OFL retained)
.github/workflows/        Source checks and an optional manual render smoke
```

Excluded from Git: `local/`, `raw/`, `exports/`, `reference/`, `renders/`, supplied project media, caches, model weights, credentials and production archives. The previous films/research cache are preserved locally under `local/production-workspace/`; that folder is not part of the public checkout. Old Git history is preserved, not force-rewritten.

## The reusable creative workflow

**Brief → three concepts → art direction → scene/cue table → key states → motion → sound → correction loops → final encode/QA → honest delivery.**

- [Narrated-film flow (current)](docs/FLOW.md)
- [Intake questions](docs/INTAKE.md)
- [Solo workflow](docs/WORKFLOW.md)
- [Optional visual-specialist handoff](docs/DELEGATION.md)

PostGen helpers: `tools/postgen/voice.mjs` (fetch narration from a PostGen project) and
`tools/postgen/post.mjs` (upload the final MP4 as a draft post). Both read `POSTGEN_API_KEY` from the
environment only. See [docs/FLOW.md](docs/FLOW.md).

Review helper: `node tools/stills.mjs <id> --frames=0,240,900 --scale=0.5` renders selected stills into ignored `.cache/review/<id>/`; `python3 tools/contact_sheet.py .cache/review/<id> --cols=3 --guides` builds a labelled contact sheet with content-margin guides. Review-only, never a deliverable.
- [Design principles](docs/DESIGN.md)
- [QA and review limits](docs/QA.md)
- [Research and sources](docs/research/README.md)
- [Tested production lessons](docs/DECISIONS.md)
- [Actual rebuild validation](docs/VALIDATION.md)
- [Assets, fonts and audio](docs/ASSETS.md)
- [Security/public-repo rules](docs/SECURITY.md)

Remotion is the clock. Framer Motion receives explicit frame-derived transforms/easing; this is an application pattern that must be tested, not an official integration. PNG capture, explicit `swangle`, matching Remotion versions and fresh/reverse seek tests are deliberate defaults from production experience.

## Scope / licenses

No creator/reference media, narration, full upstream repositories or finished exports are bundled. Explicit GitHub visual handoffs may include only the small, declared, hash-checked client logo PNGs described in docs/ASSETS.md. Research links are references, not permission to copy. Eleven upstream MIT notices are retained for attribution; their media are not covered. Shared Inter is under its included SIL OFL. This repository does not make a new blanket license grant over third-party material or generated client work. Check Remotion's current license for your use case.

## Current prepared project
[Fluton — Public Rails. Private Actions.](projects/fluton-private-actions/README.md): 30s/1080p60, ready for an optional Claude visual-only pass. Story/timing/facts/assets are prepared; visuals remain an explicit placeholder until that pass returns. This is not a finished/rendered film.
