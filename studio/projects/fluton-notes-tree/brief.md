# Brief — Fluton: notes in a tree (9:16, ~28 s)

**Project:** Fluton (confidential execution layer on Fhenix CoFHE, testnet only).
**Angle:** the mechanism, not the promise — what a "note" is and what the chain actually learns.
**Audience:** people who already understand a UTXO/private pool from Zcash-style systems; they
want the specific shape of Fluton's design, not a slogan.
**Must be remembered:** *spending reveals a nullifier — not which note.*

## Format
1080×1920, 30 fps, voice-led length (~28 s), captions on screen, silent-safe.

## Claims allowed (sourced from docs.fluton.io, 2026-11)
- Fluton holds no account balances; it holds notes (UTXO style) and one append-only Merkle tree
  of their public commitments.
- A note is `(amount, keypair, blinding, asset)`; commitment = `Poseidon(amount, publicKey,
  blinding, asset)`; nullifier = `Poseidon(commitment, leafIndex, nullifierKey)`.
- One join-split proof spends up to 2 notes (or 16) and creates exactly three new notes.
- Value conservation: `sumIns + publicAmount === sumOuts`; private transfer has
  `publicAmount = 0`; only the net amount crossing the pool boundary is public.
- `extDataHash` binds recipient, amount, fee, ciphertexts and domain fields, so a transaction
  cannot be re-targeted or overcharged by whoever submits it.
- Deposits and withdrawals expose their net amount; the pool accepts any of its last 30 roots.

## Claims forbidden
No mainnet claims, no TVL/volume/user numbers, no "audited", no token/price, no promises about
future roadmap, no naming users. Testnet only.
