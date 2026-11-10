# Fact check — Fluton: the glass ledger

Sources: fluton.io and docs.fluton.io (read 2026-11-09; `/concepts/notes-and-proofs`,
`/concepts/privacy-model`, `/reference/contracts`, `/concepts/multi-token`).

| Claim in the film | Verdict | Basis |
|---|---|---|
| a public chain is fully readable: addresses, amounts, timing | supported | public ledger transparency |
| Fluton holds no balances, only notes (UTXO style) | supported | notes-and-proofs: *"Fluton holds no account balances. It holds notes"* |
| note fields = amount, owner key, asset, blinding | supported | same page, "A note" |
| commitment = `Poseidon(amount, publicKey, blinding, asset)` | supported | same page |
| one append-only Merkle tree, depth 20, root per batch, 30 roots of history | supported | `MerkleTreeWithHistory`, depth 20, roots history 30 |
| spending one note creates exactly three | supported | "creates exactly 3 new notes" (2-input and 16-input circuits) |
| `sum in + publicAmount = sum out` | supported | value conservation in the join-split circuit |
| nullifier = `Poseidon(commitment, leafIndex, nullifierKey)`, revealed on spend | supported | "What spending reveals" |
| "spent is provable, which note is not" | supported | the pool marks a nullifier spent without learning the leaf |
| recipient, ext amount, fee and ciphertexts are bound in `extDataHash` | supported | ext-data binding — one opaque public input to the proof |
| only the net amount crossing the pool is public | supported | `publicAmount`; deposits/withdrawals expose the net amount |

**Not claimed:** no mainnet, no TVL/volume/user numbers, no audit status, no token, no roadmap,
no timing promises. "Testnet only" appears on the close card and in the caption.

**Numbers on screen are illustrative** (`13.37`, `9.00`, `4.37`, `9.36`, `3.99`, `0.02`, `−4.00`);
`9.00 + 4.37 = 9.36 + 3.99 + 0.02 = 13.37`, which is the point of the chapter.
Hash-looking strings are deterministic labels generated in `visual-system.tsx`, not real digests.
