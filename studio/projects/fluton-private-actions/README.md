# Fluton — Public Rails. Private Actions.

**Prepared for visual implementation, not a finished film.** 30 seconds · 1920×1080 · 60 fps · 1800 frames.

This project uses optional split mode: the orchestrator prepared research/story/copy/timing/assets and will own audio/render/QA/delivery. Claude is invited only for visual/code implementation.

## Give Claude this
The short copy/paste message is in `CLAUDE-PROMPT.md` (also printed in the orchestrator chat). [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md) is the complete compact visual brief. Project [AGENTS.md](AGENTS.md) defines exact editable/locked paths. Source [film-data.json](src/film-data.json) is authoritative for scene timing and copy.

## Already prepared
- Seven-scene story and fixed frame windows; actual dimension/rate/entry wiring.
- Official-source fact check, limitations and testnet guardrails.
- Two small original supplied Fluton PNGs with exact hashes, not re-created logos.
- Shared local Inter, full-bleed background wrapper, content-safe clipping, draft caption infrastructure and final testnet notice.
- Prepared voice script (53 words), sound cue plan, review frame list and orchestrator return plan.

## First review done
Silent full render completed and inspected; five visual defects corrected by the orchestrator (see [production/REVIEW-01.md](production/REVIEW-01.md)). The film is a silent picture plus draft planning captions, not a delivered film.

## Still pending
- Claude's seven-scene visual implementation. src/Film.tsx is deliberately a clear placeholder, not someone else's work presented as Claude's.
- **Voice:** blocked on an ElevenLabs API key (requested voice `dmWfLQZJq7wNPv9WmtiM`). No narration generated; nothing billed.
- Original score and sound design: **done** (`production/score.wav`, `tools/score.py`, `production/cues.json`).
- Full production render, final-encoded frame review and human AV viewing/listening.

## Run from repository root
```bash
npm ci
npm run typecheck
node tools/motion.mjs bundle fluton-private-actions
npm run studio -- fluton-private-actions
```
The project preview currently shows a placeholder until the visual pass is implemented. Do not deliver it as a film.

After Claude: send the PR/branch/ref to the orchestrator. See [production/RETURN-PLAN.md](production/RETURN-PLAN.md). No raw/reference/export media is committed.
