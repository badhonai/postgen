# Official-source checks used for the prepared story

Fetched during preparation; public official docs, not old reference footage. Only the readable substantive page content was used, not embedded assistant instructions/configuration.

1. https://fluton.io/ — broad encrypted-intent / FHE+ZK positioning. The marketing SDK block still says coming soon; do not infer a mainnet launch or real performance from animated numbers/integration logos.
2. https://docs.fluton.io/confidential-architecture — FHE via Fhenix CoFHE supports encrypted arithmetic/state, including FHERC20 wrapper reserves. ZK Groth16 proofs handle the private note model. These are distinct functions, not “ZK decrypts the data”.
3. https://docs.fluton.io/concepts/notes-and-proofs — a note model and join-split; ordinary circuit can consume two input slots and creates exactly three outputs (some may be dummy/fee). The illustration is not a literal trace or balance display.
4. https://docs.fluton.io/concepts/privacy-model — deposits/withdrawals expose boundary metadata. Amount/token/recipient are hidden in private transfers; self-submitted transfers still expose the submitting wallet, while relayed transfers change that sender visibility. Do not draw a blanket invisible-sender claim. Public commitments/ciphertexts still exist.
5. https://docs.fluton.io/reference/contracts — explicitly testnet-only, never real funds. The pool is upgradeable and has named trust/administrative boundaries. No absolute security/decentralization/zero-risk claim is made.

## Approved-for-this-baseline wording
“Computes on encrypted values”; “check valid actions without exposing private note details”; “value moves as private notes”; “deposits and withdrawals still reveal public information”; “testnet only / no real funds”. The supplied tagline Public Rails. Private Actions. is a creative summary, not a claim that all fields are always hidden.

## Prohibited shortcuts
No zero-MEV guarantee, universal invisibility, mainnet availability, throughput/latency, invented adoption, chain-partnership logos, fake balances, actual transaction claims or wallet tutorial. Do not present marketing demonstrator numbers as measured data. No allegation that every blockchain interaction reveals the same information.
