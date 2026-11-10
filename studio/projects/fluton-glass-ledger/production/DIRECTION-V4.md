# Direction v4 — "Mint Security, synced to the voice"

Reaction to v3 (and to the v2 note before it): **"freezy" and "voice and video not matching."**
Both complaints were structural, so v4 fixes the two causes rather than the symptoms.

## 1 · Why it drifted, and the fix
The old timeline was built by `align_voice.py`, which splits the audio by *sentence* and derives
chapter bounds from sentence midpoints. Two consequences:
- a chapter's content could be right while the specific fact it showed was spoken 3–5 s away;
- the audio was committed **without** the 0.6 s lead used to align it, so every cut was 0.6 s
  early relative to the picture's plan and every caption ran ahead of the voice.

v4 changes the clock, not the timing:
- `production/gen_lines.py` reads the provider's **character-level** alignment and emits
  `src/lines.json` — every word with its own start/end frame, offset by the same `LEAD = 0.6 s`.
- `production/narration-lead.wav` is the narration with that lead applied (`adelay=600`), and that
  is what gets mixed. Picture, score and voice now share one origin.
- Verified: 161 detected speech onsets in the mixed bed match the word table with a **median
  offset of 0.107 s** (max 0.59 s, which is the first syllable of a new phrase, not a drift).

## 2 · Why it felt frozen, and the fix
v3 revealed a headline once and then held it for 6–8 s. That is a slide, not a film.
- **The words are the animation.** Each spoken sentence is set on screen the whole time, and each
  word *lights up* on the frame it is spoken (opacity 0.26 → 1, small rise, a hot underline).
  Nobody has to read ahead; the eye is pulled by the voice.
- **Chapters never sit still.** A register hairline travels the frame continuously, a live frame
  counter and clock tick in the corners, serial columns keep rolling, the tree keeps appending,
  the rosette keeps turning, the join-split arithmetic lands on the words "goes in", "crosses the
  boundary", "equals", "comes out".
- **Chapter changes are cuts**: full-bleed ground flip plus a 7-frame shutter. No cross-fades.

## 3 · What was kept
Mint Security: paper `#EDEDE7` / ink `#0B0B0C`, vermillion `#FF3B1F`, cobalt `#1B4CFF`, Archivo Black
fitted display, JetBrains Mono figures, flat ink, no gradients or glow. 120 BPM score with an
impact on every chapter cut and a latch on spoken punctuation.

## 4 · Not claimed
No human has listened to the mix; sync was verified by onset matching, not by ear. No outside
creative critique.
