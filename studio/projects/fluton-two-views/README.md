# fluton-two-views

Second film on the shared motion system (`studio/system`). 16:9, 59.3 s at the current timing model,
nine chapters, one idea each.

**Mechanism:** the *witness seam* — a vertical cut through the frame separating what you see from what
the chain sees — plus *redaction bars* that cover printed values on the spoken beat.

Status: **animatic**. Picture, timing model, score and review are done; the paid voice has not been
generated yet, so `src/lines.json` uses `--estimate=2.5` timings. Pipeline to finish it:

```bash
# after generating the voice (keeps production/narration.mp3 + narration.alignment.json):
node tools/film.mjs lines fluton-two-views        # real word-level timings
node tools/film.mjs audio fluton-two-views        # narration-lead.wav
python3 tools/cues-from-lines.py fluton-two-views # optional: re-derive cues
node tools/film.mjs all fluton-two-views          # score, mix, render, master
```
