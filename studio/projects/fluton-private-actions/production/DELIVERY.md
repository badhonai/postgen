# Delivery — silent-plus-score cut

| Item | Value |
|---|---|
| Master | `renders/fluton-private-actions/fluton-private-actions-score.mp4` (also copied to the workspace root as `fluton-private-actions-30s.mp4`) |
| Picture | 1920×1080, 60 fps, 1800 frames, 30.000 s |
| Sound | original synthesized score + dry SFX, AAC 48 kHz stereo |
| Loudness | −14.16 LUFS integrated, −1.8 dBTP true peak, LRA 2.1 LU |
| Voice | **not included** — blocked on an ElevenLabs API key; no paid request made |
| Reproduction | `npm ci` → `node tools/motion.mjs render fluton-private-actions` → `python3 tools/score.py --cues projects/fluton-private-actions/production/cues.json --out projects/fluton-private-actions/production/score.wav` → `python3 tools/master-audio.py --picture … --mix … --output … --true-peak=-2.0` |

Renders and audio stay out of Git. Regenerating the score is deterministic and free. When the voice is available, run the existing narration path, align captions to the performance, re-measure the new mix and re-master; nothing in the picture needs to change.
