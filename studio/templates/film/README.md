# New film — the 8-step loop

Everything shared lives in `studio/system`. This folder holds one film: its script, its timing,
and one file per chapter.

```bash
# 1 · create
node tools/film.mjs new <slug>                 # copies this template
# 2 · write the script, then generate the voice (Liam, no speed/pitch change)
#     save production/narration.mp3 and production/narration.alignment.json
# 3 · plan the chapters: production/scenes.json  (id + which sentences + ground)
# 4 · time it: word-level
node tools/film.mjs lines <slug>               # -> src/lines.json + scene bounds
node tools/film.mjs audio <slug>               # -> production/narration-lead.wav
# 5 · write one chapter per file in src/scenes/, register it in src/Film.tsx
# 6 · look at it
node tools/film.mjs stills <slug> --frames=60,300,600 --scale=0.25
python3 tools/contact_sheet.py .cache/review/<slug>
# 7 · score it from production/cues.json, mix, master
node tools/film.mjs sound <slug>
# 8 · render and master
node tools/film.mjs render <slug>
node tools/film.mjs master <slug>
```

## Files
| path | what it is |
|---|---|
| `production/voiceover.txt` | the script that was spoken — the source of truth for the words |
| `production/narration.mp3` | the paid voice artifact; committed, never regenerated casually |
| `production/narration.alignment.json` | provider character timings (input to `lines`) |
| `production/scenes.json` | chapter order + sentence indexes + ground colour |
| `src/lines.json` | generated: every word with its start/end frame |
| `src/film-data.json` | generated: scene bounds, palette, duration |
| `src/scenes/*.tsx` | one chapter each; copy `scenes/Open.tsx` |
| `production/cues.json` | music cues, authored by hand from the chapter bounds |
| `brief.md`, `storyboard.md` | the two documents a film still needs |

## The rules that make it look directed
Read `studio/system/README.md`. Short version: words are the animation, nothing sits still,
colour is a cut, type is fitted, springs settle, and no gradients, glow or particles anywhere.
