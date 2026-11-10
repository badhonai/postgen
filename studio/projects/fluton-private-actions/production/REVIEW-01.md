# Orchestrator review 01 — silent picture

Reviewed the returned visual pass (patch `af67b5c`, applied unchanged to a branch) by rendering stills and inspecting them. This is frame-by-frame inspection of sampled frames, not continuous playback or an independent human critic.

## Verdict
The seven scenes are structurally sound and visually distinct: scan/observer → layered cutaway → sealed arithmetic → proof-and-check → notes ledger → public/private section → rail lockup. Copy, palette, timing and the supplied wordmark are respected; no wall-clock animation, network fetches or dependency changes. Accepted as the base for audio work, with the corrections below.

## Defects found and fixed (orchestrator)
1. **Scene 2 (frames ~200–215):** SEND and VOTE icons/labels overlapped while the cards merged. Card contents now dissolve before the faces stack; the INTENT face stays legible.
2. **Scene 7 (all frames):** the rails, ties and riding tiles collided with the "PRIVATE ACTIONS." baseline. Rails moved below the lockup; the tiles now ride clear of the type.
3. **Scene 7:** the CTA underline (236 px) was wider than the "fluton.io" wordmark. Corrected to 206 px.
4. **Cuts at 900, 1200, 1500:** each landed on a nearly empty background while structure built from nothing. Ledgers/section/rails/wordmark now pre-exist at the cut and settle, so transitions read as continuation rather than a blank flash.
5. **Scene 3:** the comparison threshold tile dropped through empty sky with no guide. A dashed guide line now connects it to the housing roof, and the housing is pre-seated at the 360 cut.

## Evidence
- Full silent render: 1800 frames, 1920×1080, 60 fps, 30.000 s, full decode, no browser errors.
- Seek determinism: frame 900 re-rendered after future/reverse seeking and in a fresh browser matched byte-for-byte; frame 0 and 1799 included.
- Stills inspected at 0, 45, 90, 135, 180, 210, 240, 300, 360, 420, 450, 480, 500, 540, 560, 600, 629, 630, 660, 700, 720, 750, 810, 840, 860, 880, 899, 900, 920, 940, 950, 970, 990, 1010, 1020, 1080, 1110, 1140, 1199, 1200, 1240, 1280, 1320, 1350, 1380, 1410, 1470, 1499, 1500, 1520, 1530, 1540, 1560, 1580, 1600, 1620, 1650, 1700, 1750, 1799, plus eight frames sampled from the encoded MP4.
- Headline widths were checked visually against the x=96…1824 content margins at 1080p; no line crosses the frame edge. They are not string-measured by code, so a future copy change needs a fresh check.

## Still open
- Narration: script only. No voice selected, recorded or generated; captions are draft planning lines, not recording-aligned.
- Music/SFX: not composed; cue frames below are estimate from the accepted visual pass.
- No continuous audiovisual watch/listen and no independent aesthetic review has occurred.
- Scene 4's camera push and scene 3's tile entries were checked at sampled frames only, not every intermediate frame.

## Estimated visual contact frames for score accents
45 scan hits SWAP; 90/135 locks SEND/VOTE; 112–166 trail pulse; 180 match cut; 240 card→slab flatten; 300 stack resolves; 360 cut to FHE; 520 ADD mouth entry; 560 sum leaves; 566 threshold drops into COMPARE; 630 cut to ZK; 700 proof forms; 754–762 proof docks; 770 lever/lamp/tick; 900 cut to notes; 1116–1130 notes consumed; 1190–1216 outputs land; 1200 cut to boundaries; 1260 token crosses entry wall; 1290–1300 receipts print; 1360 token exits; 1500 cut to brand; 1572 wordmark settles; 1620 headline settles; 1680 CTA settles; hold to 1799.
