# Visual specialist handback
Status: first visual pass complete for all seven scenes. **Not rendered or visually inspected** (no browser available in the authoring environment).

- Branch / PR: `visual/fluton-private-actions` (from main @ 9220831). PR/push status is recorded in the chat handback.
- Scenes completed (all 7, local-time = frame − startFrame):
  1. **exposure** — observer scan beam lights three public action cards (SWAP/SEND/VOTE) and draws the green trail behind it; lock-on brackets, then a pulse travels the trail. No addresses/balances.
  2. **intent** — match cut from scene 1 (same cards/trail, inverted to ink on green); trail retracts, cards merge into one INTENT card, which flattens into the top face of an oblique layered cutaway (INTENT / CONFIDENTIAL EXECUTION / PUBLIC CHAIN). A dot descends, is hidden behind the opaque execution layer, lands on the public layer.
  3. **fhe** — sealed tiles A and B ride a conveyor into an opaque ADD housing (clipped at the mouths); a sealed sum leaves, enters COMPARE, a sealed threshold drops through its roof, a sealed result leaves. Tile texture is a fixed-seed pattern, never content.
  4. **zk** — line-art note chamber (never opens; only a small port door) emits one hex proof that arcs to a mechanical check; it docks in a hex-shaped slot, lever throws, lamp lights, check draws. Only scene with a camera push.
  5. **notes** — vertical join-split between two ledger planes: two sealed notes enter top slots (occluded by the gadget face), three leave different bottom slots and fan out on the lower ledger. Labels "2 SEALED NOTES IN / 3 SEALED NOTES OUT"; no amounts/tokens/recipients.
  6. **boundaries** — side section: public entry bay → opaque private interior → public exit bay. Token is plain in public, sealed between the two boundary planes (clip regions at the walls). Entry/exit receipts print from behind the wall with AMOUNT / TOKEN / ADDRESS rows; eye icon + PUBLIC at the boundary, closed eye + PRIVATE inside.
  7. **brand** — sealed tiles ride two public rails and rest by local 172; exact bundled wordmark (HTML `Img`, aspect from `WORDMARK_ASPECT`), PUBLIC RAILS. / PRIVATE ACTIONS. headline, exact mark + `fluton.io` CTA settled by local 120 (global 1620). Held through 1799; no fade-out.
- Files changed (only editable paths): `src/Film.tsx`, `src/visual-system.ts`, `src/components/{Item,Headline,Sealed,ActionCard}.tsx`, `src/scenes/{Exposure,Intent,Fhe,Zk,Notes,Boundaries,Brand}.tsx`, this file.
- Frame-clock contract: only `useCurrentFrame()` (via Film → scene `f`). Framer Motion `motion.g/div` get plain frame-derived numbers through `style` with `initial={false}`; no animate/exit/layout/timers/CSS keyframes/rAF. Easing via framer `cubicBezier`. Fixed-seed hash only. Only the active scene renders (nothing off-stage to leak under captions).
- Actual contact/landing frames for sound accents (global frames, from local timings in code; estimates until rendered):
  - 0–100 scan sweep; card lights ≈ 22 / 45 / 68; trail pulse 112–162 (cards flash at ≈112, 137, 162).
  - 180+8…40 cards merge; 220–254 card flattens to slab; 250–276 slabs rise; 250–282 layers open; 284–324 dot descends (passes behind execution layer ≈300–312); ripple lands ≈324.
  - 360+: A/B reach ADD ≈ 410–440; ADD work 444–474; sum emerges ≈ 472; threshold pop 494; threshold lands ≈ 546; compare work 556–584; result emerges ≈ 586.
  - 630+: port opens 714–730; proof forms 730–752; travel 754–812; docks 814–830; lever 830–850; lamp 834; check draws 844–870.
  - 900+: input notes enter slots 980–1028 and 1000–1048; flow lines 1028–1092; outputs leave slots ≈ 1090 / 1100 / 1110 and settle ≈ 1140–1160.
  - 1200+: token crosses entry wall plane ≈ 1322 (receipt prints 1322–1350, rows 1350–1384); crosses exit plane ≈ 1406; exit receipt prints 1408–1436, rows 1434–1468.
  - 1500+: rails tiles decelerate to rest ≈ 1672; wordmark in 1516–1550; headline 1544–1590; CTA 1596–1618.
- Typecheck/bundle commands actually run and results: `npm ci` (ok); `npm run typecheck` → clean; `node tools/motion.mjs bundle fluton-private-actions` → "Bundled: fluton-private-actions". A `still` attempt failed (no Chrome available), so no frames were rendered.
- Remaining visual limitations / things to check on first render (unverified by eye):
  - Headline widths were estimated, not measured (Inter 900 @ 88–112 px). Check S5 headline vs ledger edge (x≈1020), S2 line 2 vs the slab stack (x≈1180), S4 headline length.
  - S2 morph (flat card → oblique top face) and the glyph/label hand-off at local ~40; S2 labels' dashed leader lengths use a character-count estimate.
  - S3 tile entry into the ADD/COMPARE mouths relies on clip regions at x = housing edge ±14; confirm it reads as "swallowed by the mouth".
  - S4 camera push is scale 1.06 + 60 px pan; confirm essential art stays within x 96–1824.
  - S6 receipts slide out from behind the interior wall; confirm contact at the wall and that rows read ≥30 px.
  - `→`-style glyphs avoided on purpose (font subset unknown); arrows/checks are drawn paths.
  - Tiny early-frame risks: round-cap dots on dash-drawn paths are guarded (`>0.001`), but check frame 0 of scene 7 (rails + first tiles) and frames 180/360/630/900/1200/1500 for hard-cut cleanliness.
- Blocked locked-file requests: none.
- Usage-limit partial work / unfinished scenes: none; all seven scenes are implemented.

Production renders, QA, audio and delivery remain with the orchestrator.
