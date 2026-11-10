# Seven-scene cue sheet

All ranges are [start, end-exclusive), at 60 fps. src/film-data.json is authoritative. Key states are planned review anchors, not the only inspection samples.

| Scene | Frames / seconds | Visual mechanism | Key-state frame | Meaning |
|---|---|---|---:|---|
| Exposure | 0–180 / 0–3s | Observer scan / public activity trail | 72 | Public activity can reveal more than intended |
| Intent | 180–360 / 3–6s | Trail reframed as execution-layer cutaway | 252 | Introduce Fluton without a fake wallet UI |
| FHE | 360–630 / 6–10.5s | Sealed-value arithmetic mechanism | 444 | Compute without opening encrypted values |
| ZK | 630–900 / 10.5–15s | Private chamber emits a verifiable proof | 720 | Check validity without displaying private notes |
| Notes | 900–1200 / 15–20s | Two consumed notes → three new notes | 1020 | Private note movement, not a visible bank balance |
| Boundaries | 1200–1500 / 20–25s | Public entry / private interior / public exit | 1320 | Boundary metadata remains public |
| Brand | 1500–1800 / 25–30s | Exact flat brand lockup / clean held payoff | 1620 | Public rails, private actions; testnet only |

The last scene settles by 1680. Keep the close readable through 1799. No arbitrary repeated transitions; action and visual relationships should determine the handoff.

Review every boundary at -2/-1/0/+1/+6/+18 frames, each actual contact/occlusion, the first/last frame, representative holds, and multiple points through any mask. The orchestrator will inspect actual rendered evidence after implementation.
