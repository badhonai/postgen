# QA gates and honest evidence

## Automated baseline
`npm test`, `npm run typecheck`, `npm run build:check`, `npm run doctor`.
Render a small difficult excerpt before committing to the full film. `npm run qa -- slug` samples a midpoint, future frame, frame zero and repeated midpoint, then compares the midpoint in a fresh browser. Explicit swangle is the baseline. This is sampled determinism, not exhaustive proof for every frame/prop.

The render report fingerprints source, assets and dependency lock, plus the actual movie hash; stale/replaced outputs are rejected. When the matching render/report exists, QA checks dimensions, fps, frame count, duration and full FFmpeg decode. Audio is measured when present. If no final file exists, encoded QA is null: do not describe that as an encoded-file pass. Partial `--frames=a-b` outputs are named separately and checked against their own render report, never substituted for a full film.

## Required visual review for production
Inspect source key states and consecutive/near-consecutive frames around every handoff and contact: initial anticipation, impact, occlusion, label changes, climax, first/last and optional loop seam. Inspect samples from the **final encoded MP4**, not only source PNGs. Record exact indices, evidence filenames, defect and correction. Recheck adjacent frames after a fix.

Specific regressions learned here: objects must enter through the actual slot, not disappear while floating over a box face; caption background removal must not expose off-screen entry objects; captions must maintain contrast; independent YES/NO choices must not be drawn as conversion arrows.

## Sound / master
Check actual supplied voice offset, no unauthorized speed/pitch change, cue/transient alignment, ducking, loudness, true peak, clipping, channels, sample rate and exact AV durations. −14 to −16 LUFS and a ceiling below −1 dBTP are useful defaults, not universal laws; use the delivery brief. Re-measure encoded AAC, not only WAV. A visual-only revision can copy the prior approved AAC without re-encoding; verify packet/decoded-sample identity if claiming audio unchanged.

Optional `tools/master-audio.py` takes an existing picture and PCM mix for two-pass normalization and a single AAC encode. It does not compose music or synthesize a voice.

## Required report language
Separate: commands/tests actually run; frames actually inspected; audio measurements; uninterrupted AV viewing/listening (if any); independent review (if any); remaining uncertainty. Automatic ASR, contact sheets, full decoding and signal metrics do not prove perception, musical quality or professional approval. Never claim a seamless loop solely because an endpoint PNG matches. Never invent a review score as a pass gate.

## Sampled stills and contact sheets
`node tools/stills.mjs <id> --frames=… --scale=0.5` renders chosen frames in one browser session; `python3 tools/contact_sheet.py <dir> --guides` labels them and overlays the 96/1824/120/840/880 safe-area lines. Use them to inspect handoffs, contacts, occlusion and cuts. They complement, and never replace, the encoded QA report or honest statements about continuous playback.
