# Fact check — Fluton: notes in a tree

Sources: docs.fluton.io, read 2026-11-10 (`/concepts/notes-and-proofs`, `/concepts/privacy-model`,
`/reference/contracts`, `/concepts/keys-and-view-keys`, `/concepts/multi-token`).

| On-screen / spoken claim | Verdict | Source |
|---|---|---|
| "Fluton doesn't keep balances, it keeps notes" | supported | notes-and-proofs: *"Fluton holds no account balances. It holds notes, in the UTXO style"* |
| note = `(amount, keypair, blinding, asset)`, commitment = Poseidon(amount, publicKey, blinding, asset) | supported | same page, "A note" |
| one append-only Merkle tree, depth 20 | supported | "The Merkle tree" (`MerkleTreeWithHistory`, depth 20) |
| spending destroys a note and creates **exactly three** new notes | supported | "creates exactly 3 new notes in both cases" (2-input and 16-input circuits) |
| nullifier = Poseidon(commitment, leafIndex, nullifierKey); spending reveals it | supported | "What spending reveals" |
| "spent is provable, which note is not" | supported | the pool marks a nullifier spent without learning which leaf it was |
| only the net amount crossing the pool is public | supported | value conservation, `publicAmount`; deposit/withdrawal expose net amount |
| "amounts do not cross" (inside the pool) | supported | note ciphertexts hold amounts; commitments hide them |

**Not claimed:** no mainnet, no TVL/volume/user numbers, no audit status, no token/price, no
roadmap. The film says "testnet only" on the end card and in the caption.

**Numbers shown on screen** (`13.37`, `−4.00`) are illustrative examples copied from the
documentation's own deposit/withdrawal walkthrough, not live pool data.
