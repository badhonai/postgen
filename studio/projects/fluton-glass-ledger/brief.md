# Project brief — Fluton: the glass ledger

Status: delivered as a draft post; the user publishes.

- **Audience / platform:** crypto-curious and privacy-minded followers, X, 16:9 in-feed video.
- **Single message / action:** Fluton keeps notes, not balances — everything but the net amount
  crossing the pool stays sealed. Action: read the thread under the post.
- **Verified facts / sources:** fluton.io + docs.fluton.io, recorded in `production/FACT-CHECK.md`.
- **Spec:** 1920×1080, 30 fps, 1548 frames, 51.60 s.
- **Brand assets:** user-supplied `brand/fluton-mark-white.png`, `brand/fluton-wordmark-white.png`
  (byte-exact, hashes in `assets.json`); brand rights stay with the owner.
- **Voice:** Liam (`TX3LPaxmHKxFdv7VOQHJ`), separately authorized generation, no speed/pitch change.
- **Music / sound:** original synthesis from `tools/score.py` driven by `production/cues.json`; no
  third-party samples or library music.
- **Accessibility:** one spoken sentence per chapter burned into the caption band; testnet notice
  on the close card and in the caption band.
- **Constraints:** no gradients, glow, flare, particles, RGB split or camera shake; one persistent
  system that never cuts away; green = sealed, blue = proof/hash, red = refused.
