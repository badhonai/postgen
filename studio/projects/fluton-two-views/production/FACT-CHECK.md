# Fact check — Fluton: two views

Sources: fluton.io and docs.fluton.io (read 2026-11-09: `/concepts/notes-and-proofs`,
`/concepts/privacy-model`, `/concepts/encryption`, `/reference/contracts`).

| Claim in the film | Verdict | Basis |
|---|---|---|
| the sender sees amount, recipient and fee | supported | the note and its ciphertext are readable with the owner's viewing key |
| the chain sees a commitment hash, a nullifier and gas | supported | on-chain state is commitments, roots, spent nullifiers and ext-data hash |
| the chain never learns amount, receiver or the link back | supported | commitments and ciphertexts hide them; the nullifier is unlinkable to the leaf |
| correctness is checked while values stay encrypted | supported | FHE (Fhenix CoFHE) arithmetic plus Groth16 proofs over the same statement |
| value balances: nothing is created | supported | `sum in + publicAmount = sum out` enforced by the join-split circuit |
| the public part is the size of the crossing | supported | `publicAmount` is visible for deposits and withdrawals |
| "privacy is not the absence of proof" | framing | a slogan, not a technical claim; it summarises proof-without-disclosure |

**Not claimed:** no mainnet, no audit status, no TVL/volume/user numbers, no token, no roadmap.
"Testnet only" appears in the chrome notice on the close chapter and in the post caption.

Figures on screen are illustrative: `13.37`, `−4.00`, `0.02`, `0.00041` gas. Hash-looking strings are
deterministic labels from `system/motion.ts#hex`, **not** real digests.
