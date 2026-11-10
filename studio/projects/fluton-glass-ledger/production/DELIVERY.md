# Delivery — Fluton: the glass ledger (16:9)

| | |
|---|---|
| Film | `renders/fluton-glass-ledger/fluton-glass-ledger-master.mp4` |
| Spec | 1920×1080, 30 fps, 1548 frames, 51.60 s |
| Voice | Liam — Energetic, Social Media Creator (`TX3LPaxmHKxFdv7VOQHJ`), 50.39 s, no speed/pitch change |
| Audio | narration + original synthesized score (`tools/score.py`, cues in `production/cues.json`), mixed and mastered in one pass |
| Loudness | −14.07 LUFS integrated, −1.76 dBTP true peak |
| Size | 3.6 MB (well inside the 50 MB video limit) |
| Working files | `studio/projects/fluton-glass-ledger/` (clearable from PostGen → Studio) |

## Scene map (frames @30 fps)
| scene | frames | spoken line |
|---|---|---|
| ledger | 0–170 | Every public chain is a glass ledger. |
| note | 170–404 | Fluton keeps a different book: notes, not balances. |
| tree | 404–582 | Each note is one sealed commitment — a leaf in one tree. |
| joinsplit | 582–836 | Spend one note and it becomes three. Value is conserved. |
| nullifier | 836–1007 | The chain learns a nullifier — spent, never which. |
| extdata | 1007–1255 | Recipient, amount, fee and ciphertexts are bound in one hash. |
| boundary | 1255–1342 | Only the net amount crossing the pool is public. |
| close | 1342–1548 | Everything inside stays sealed. |

## What was checked, and what was not
- Layout reviewed as contact sheets at 0.25 and 0.5 scale, iterated four times: type scale was
  too small for 1920, tree geometry was inverted, note internals collided with their frames,
  the close tagline crossed the frame rule, and the chapter counter sat in the caption band.
- Every chapter boundary checked at ±10 frames: each chapter builds from an empty field, so a
  boundary reads as a change of content under a stable headline and frame, not as a cut.
- Full render: 1548 frames, deterministic seeks, no browser errors.
- Master: full decode, video stream copied, loudness and true peak measured on the encoded file.
- Narration carries a 0.6 s lead (the same lead used to align captions), so speech, cuts and
  captions share one clock.
- **Not** verified: listening by ear (the mix was checked by measurement, a spectrogram of the
  bed and the score's crest factor, not by a human critic), and no outside creative critique.
