# Storyboard — Fluton: the glass ledger (16:9)

Direction basis: `studio/archive/direction/` — the v1 showreel system (one persistent system,
fixed orthographic framing, critically damped springs + exponentials, frame-derived motion,
palette green/blue/black/white) and the v2 rule that each chapter carries one intent.

## System
- 1920×1080, 30 fps, 1548 frames / 51.59 s. One composition; the frame, the 8-column grid,
  the top rule and the progress rule live in `Film.tsx` and never cut.
- Type scale fixed once: 76 / 28 / 20 / 30 / 42 / 150. Nothing scales with the camera.
- Palette: `#09090B` bg, `#27272A` hairline, `#3F3F46` structure, `#F8FAFC` ink, `#A1A1AA` dim,
  `#05DF72` sealed/valid, `#2B63D9` proof/hash, `#EF4444` refused.
- Captions: one spoken sentence per chapter, in the caption band; the testnet notice sits at
  the right of that band for the last two chapters.

## Chapters
| # | id | frames | line | picture |
|---|---|---|---|---|
| 01 | ledger | 0–170 | Every public chain is a glass ledger. | six fully legible ledger rows: address, amount, time; "no privacy by default" |
| 02 | note | 170–404 | Fluton keeps a different book: notes, not balances. | a balance is struck out; four private fields fold into one commitment hash |
| 03 | tree | 404–582 | Each note is one sealed commitment — a leaf in one tree. | root at top, leaves at bottom, the note becomes the newest leaf; thirty accepted roots kept |
| 04 | joinsplit | 582–836 | Spend one note and it becomes three. Value is conserved. | two notes spent, three written, `sum in + public = sum out` |
| 05 | nullifier | 836–1007 | The chain learns a nullifier — spent, never which. | one nullifier published; four untouched leaves; "spent: provable, which: not" |
| 06 | extdata | 1007–1255 | Recipient, amount, fee and ciphertexts are bound in one hash. | five public fields fold into `extDataHash`; retarget the recipient and the proof is refused |
| 07 | boundary | 1255–1342 | Only the net amount crossing the pool is public. | one public number on the left, three sealed notes on the right |
| 08 | close | 1342–1548 | Everything inside stays sealed. | lockup lands, one intent, nothing else |

## Motion law
Every element enters with `spring` (critically damped, no overshoot) or `expo`; nothing moves
because of the camera. No gradients, glow, flare, particles, RGB split or shake anywhere.
