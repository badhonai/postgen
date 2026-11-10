# The motion system — how a new film gets made in this repo

Everything reusable lives in `studio/system/`. A film is a script, a chapter plan and one file per
chapter. If you are about to write a new `visual-system.tsx` inside a project, stop: it belongs in
`studio/system`, and the film should import it.

## The loop

```bash
node tools/film.mjs new    <slug>          # 1 · scaffold
# 2 · write production/voiceover.txt, generate the voice, keep narration.mp3 +
#     narration.alignment.json, write production/scenes.json (chapters + sentences + ground)
node tools/film.mjs lines  <slug>          # 3 · word-level timings -> src/lines.json + scene bounds
node tools/film.mjs audio  <slug>          # 4 · narration-lead.wav with the same 0.6 s lead
# 5 · write src/scenes/*.tsx, register each id in src/Film.tsx
node tools/film.mjs stills <slug> --frames=60,300,600 --scale=0.25
python3 tools/contact_sheet.py .cache/review/<slug>          # 6 · look at it, fix it, look again
node tools/film.mjs score  <slug>          # 7 · production/cues.json -> score.wav
node tools/film.mjs mix    <slug>
node tools/film.mjs render <slug>
node tools/film.mjs master <slug>          # 8 · -14 LUFS, -2 dBTP, full decode
```

`node tools/film.mjs all <slug>` does 7 and 8 in one go once the picture is written.

## The modules

| file | owns |
|---|---|
| `system/motion.ts` | `clamp`, `lerp`, `prog`, `settle`/`sp` (critically damped, no bounce), `ex` (quint), `beatFrames`, `fit`, `hex`, `serial` |
| `system/tokens.ts` | `Palette`, `Spec`, `MINT_SECURITY` direction, `TYPE` scale, ground/ink helpers, colour scripts |
| `system/fonts.ts` | `DISPLAY` (Archivo Black), `MONO` (JetBrains Mono), `UI` (Inter) — bundled, SIL OFL |
| `system/lines.ts` | `makeLines(raw)` → `sentencesOf`, `wordsOf`, `at`, `sentenceStart`; word-level timing lookups |
| `system/type.tsx` | `Words` (a sentence that stays on screen and lights up word by word), `Fig` |
| `system/primitives.tsx` | `MaskLines`, `Stamp`, `Marquee`, `Rosette`, `Mono` — printed objects, no effects |
| `system/chrome.tsx` | `FilmChrome`: ground, 7-frame shutter, register hairline, counters, progress rule |
| `tools/film.mjs` | the pipeline above, one subcommand per step |
| `tools/word-lines.py` | provider character alignment → `src/lines.json` |
| `templates/film/` | the scaffold a new film starts from, with a worked chapter in `src/scenes/Open.tsx` |

Each project has a one-file binding, `src/system.tsx`, which re-exports the system and adds its own
`P`, `W`, `H`, `SIDE`, `FILM` constants from `film-data.json`. Chapters import from `../system` only.

## Why word-level timing

Sentence-level splitting puts cuts mid-sentence and lets a fact appear seconds away from the words
that explain it; that reads as "the video does not match the voice". `word-lines.py` emits every word
with its start and end frame, so:

- a chapter's bounds always fall in a **gap between sentences**, never inside one;
- any element can be keyed to its own word: `at('joinsplit', 'equal')`;
- the narration is mixed with the same `LEAD` used for the picture, so voice, cuts and score share
  one origin. Verify with an onset check (detect speech onsets in the mix, match them against the
  word table, expect a median offset well under 0.15 s).

## The eight rules

1. One ground per chapter, changed with a hard cut and a 7-frame shutter. No dissolves.
2. The words are the animation: the sentence is on screen throughout, each word lights on its frame.
3. Nothing sits still — every chapter carries one continuous motion (register, tree, rosette, serial).
4. Colour is a cut, not decoration: full-bleed flips mark the argument's turns.
5. Type is fitted with `fit()`, never floated in the middle of the frame at 40 px.
6. Springs settle in two frames; eases are quint. No expo tails that look like a freeze.
7. No gradients, glow, blur, particles, RGB split or camera shake. Ever.
8. Every frame is a pure function of the frame number. No CSS transitions, no timers.

## Review gates (honest limits)

- Contact sheets at every chapter boundary ±10 frames, and at each chapter's midpoint, at 0.25 and
  0.5 scale. Fix overset type, collisions and dead frames; re-render and look again.
- Onset match against the word table for sync.
- Loudness and true peak measured on the encoded file, plus a full decode.
- **Not** automated: listening by ear, and independent creative critique. Say so in `DELIVERY.md`.
