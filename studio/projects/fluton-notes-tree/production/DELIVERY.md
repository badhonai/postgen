# Delivery — Fluton: notes in a tree (9:16)

| | |
|---|---|
| Film | `renders/fluton-notes-tree/fluton-notes-tree-final.mp4` |
| Spec | 1080×1920, 30 fps, 844 frames, 28.13 s |
| Voice | Liam — Energetic, Social Media Creator (`TX3LPaxmHKxFdv7VOQHJ`), 26.93 s |
| Loudness | −14.29 LUFS integrated, −1.99 dBTP true peak |
| Post | draft `39977456-cb21-4c33-8f7f-de85876cd4c9`, type `post`, video asset `6e4b6c8e-…` |
| Working files | studio job `60f2955c-b8a4-4611-9994-7e66309445c1` (PostGen → Studio) |

## Scene map (frames @30fps)
| scene | frames | spoken line |
|---|---|---|
| hook | 0–54 | Fluton doesn't keep balances. |
| notes | 54–94 | It keeps notes. |
| note | 94–335 | Each note is a sealed commitment — one leaf in a single tree. |
| split | 335–451 | To spend, you destroy a note and create three new ones. |
| nullifier | 451–637 | The chain learns one thing: a nullifier. Spent — not which. |
| boundary | 637–729 | Only the net amount crossing the pool is public. |
| seal | 729–844 | Everything inside stays sealed. |

## What was checked, and what was not
- Stills at every cut and contact frame, at 0.25 scale, inspected as a contact sheet (three
  layout passes: fixed clipped balance number, tiles colliding with the caption band, the
  commitment line overlapping its label, tree/leaf overlap, wordmark/subtitle collision).
- Full render: 844 frames, deterministic seeks, no browser errors (`motion.mjs qa`).
- Master: full decode, video stream copied, loudness/true-peak measured on the encoded file.
- **Not** verified: continuous audio listening (the mix was checked by measurement and
  spectrogram, not by ear), and no independent critique of the creative direction.

## Tooling fixes made during this film (already in the repo)
1. `tools/align_voice.py` — merges the shortest sentence into a neighbour until the script has
   exactly one line per scene (previously it only merged trailing lines, and min-frames could
   merge into an already-merged neighbour and fail).
2. `tools/score.py` — note names are parsed, not read from a six-key dictionary, so any chord in
   `cues.json` plays; `cues.json` accents use `time` + `impact|dry|latch|click`.
3. `tools/mix_audio.py` — `amix duration=longest`; the bed no longer came out ~0.65 s short.
4. `tools/studio/archive.mjs` — accepts `--project=<uuid>` as documented.
5. Environment: ffmpeg plus the Chromium system libraries (`libnss3`/`libnspr4`/…) are required
   before Remotion can open a browser.
