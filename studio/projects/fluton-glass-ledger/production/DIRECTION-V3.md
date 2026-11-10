# Direction v3 — "Mint Security"

Reaction to v2: it was correct and calm. Correct is not the brief. This pass keeps the
research and throws out the *temperament*.

## What was wrong (named, so it is not repeated)
v2 read as the current default look for this category: near-black ground, one acid accent,
tracked-out all-caps eyebrows, middle-dot meta strings, hairline data tables, tiny monospace
labels, and every element doing the same gentle spring. Those are defaults, not decisions —
they are the tells catalogued in Anthropic's `frontend-design` skill, and independently in the
kinetic-typography craft writing: *"a different effect on every word, letter scrambles, glow,
blur on everything, centred everything"* is how generated type motion announces itself.

## The subject, used as the source of the look
Fluton holds **notes**. A note is a printed instrument: it has a serial, an engraved ground, a
seal, and a denomination. So the film is designed as **security printing** — banknote engraving,
serial numbering, stamps, guilloche line-work — and then moves at the speed of a title sequence.

## Movement: Mint Security
Paper and ink, no gradients, no glow. Colour is used as a *cut*, not as decoration: whole frames
flip to vermillion or cobalt so the eye is re-set on the beat. Type is monumental and fitted to
the frame edge; the drawing is drawn by rules, serials and rosettes, never by cards or chips.
Everything is flat, printed, and hard-edged; energy comes from scale, colour flips and rhythm,
not from effects.

## Tokens
| role | value |
|---|---|
| paper (ground 1) | `#EDEDE7` |
| ink (ground 2) | `#0B0B0C` |
| vermillion (refused / spent) | `#FF3B1F` |
| cobalt (proof / hash) | `#1B4CFF` |
| display | Archivo Black, fitted, `-0.02em`, line-height 0.88 |
| figures | JetBrains Mono 700–800 for serials, denominations, equations |
| captions | Inter 600, 30 px, in the caption band (accessibility, not design) |

## Colour script (per chapter ground)
paper → ink → paper → **vermillion** → ink → **cobalt** → paper → ink.
Three full-bleed colour chapters carry the three turns of the argument: the split, the binding,
the seal.

## Motion law
- **Shutter**: each chapter opens by a full-height ground shutter wiping off over 7 frames, plus
  a 1.03 → 1.00 scale settle. No cross-fades anywhere.
- **Slam**: stamps land with squash (scaleX 1.12→1, scaleY 0.9→1) and a −6° rotation; they do not
  bounce.
- **Mask lines**: display lines rise out of a mask, 2 frames apart per line. Nothing types out.
- **Marquee**: one band per film, velocity constant, no easing.
- **Continuous motion**: a guilloche rosette or a rule scroll keeps every frame alive, so the
  film never sits still — this is what "calm" was missing.
- Nothing moves without a reason a viewer can name.

## Rhythm
The score is 120 BPM, so a beat is 15 frames at 30 fps. Type events land on beats; the shutter
lands on the downbeat of each chapter. Chapters are 5.7–8.5 s, so each has 11–17 beats of
material — enough for two or three events plus a hold, never one idea stretched thin.

## References studied (not copied)
Security-print engraving (guilloche, serials, seals); Swiss Brutal poster systems (fitted type,
flush-left, hard cuts); 2026 kinetic-typography craft guidance (per-word staging, ≤3 words/second,
hold the last line, two moves per piece); Remotion's own text-animation guidance (baseline-pivoted
scale, `geometricPrecision`, springs that settle in one or two frames rather than long expo tails).
