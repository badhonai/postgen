# Visual implementation brief — Fluton / Public Rails. Private Actions.

**Your job is the visual film, not a new strategy document.** The user selected a 30-second energetic 16:9 explainer. Research/story/copy/timing are prepared by the orchestrator. Implement a complete first visual pass in the allowed files. Do not spend usage on alternative scripts, production renders, narration, music or broad research.

## Fixed contract
- 1920×1080, 60 fps, frames 0–1799. Composition FlutonPrivateActions; existing entry/wrapper stay unchanged.
- Film.tsx must export Film. It may import your own scene/components/visual-system modules.
- Read src/film-data.json for exact scene ranges, backgrounds, foregrounds, headline/kicker, narration context and representative key states. Import getSceneAtFrame/film from timeline.ts and BRAND from brand.ts. Copy comes from that data, not retyped alternatives.
- The wrapper owns full-bleed background, local font loading, draft captions and the final testnet notice. It clips YOUR artwork at y=880. Keep essential visual content within x=96…1824, y=120…840; do not draw your own subtitle strip/captions or change the wrapper.
- Inter variable weights 600/900, family inherited; no extra fonts/dependencies. Small labels >=28 px, supporting text >=36, main headings roughly 88–112. Large compositions, not a dashboard of tiny labels.
- Exact white wordmark and mark are bundled. Preserve aspect/alpha/white face; never typeset an imitation or trace/redesign them. Use them only where contrast is sound. A flat final lockup is intentional: do not remake the older 3D logo-docking film.

## Visual thesis
Show **different kinds of privacy work**, not seven identical cards with new text. Viewers should understand the contrast between observable chain activity, computing on encrypted state, proving validity, private note movement, and visible pool boundaries. The film is a conceptual explainer—not a live UI, wallet tutorial, cryptographic simulation or real transaction.

### Scene mechanisms (frame boundaries are authoritative in film-data.json)
1. **0–179 / exposure, ink.** An observer scan reveals three public action cards and their connected trail. Distinct first-second event. Headline: MORE THAN YOU INTEND. No invented addresses, balances or performance numbers.
2. **180–359 / intent, green.** Transform/reframe that trail into an intention and an execution-layer cutaway. Clear new silhouette and hierarchy; not the previous film's privacy shutters.
3. **360–629 / FHE, blue.** Sealed encrypted-value tiles go through an addition/comparison mechanism without opening. Explain with movement, not fake code. Their contents must remain unreadable; avoid implying FHE decrypts data for the operator.
4. **630–899 / ZK, ink.** A separate private note chamber emits a compact proof. A mechanical check accepts the proof without opening the chamber. Change layout, camera/material and motion verb from FHE. This is validity, not “proof that an opinion is true”.
5. **900–1199 / notes, white.** A ledger-plane transformation consumes two sealed input notes and creates three output notes. This is an illustrative ordinary join-split, not an animated bank balance. Keep input and output identities/contact geometry coherent. Don't expose an amount/token/recipient in a private note.
6. **1200–1499 / boundaries, blue.** Architectural section: public entry receipt → private interior → public exit receipt. Public labels AMOUNT / TOKEN / ADDRESS live at the boundary. This scene must prevent “everything is invisible” misunderstanding. No disappearing all chain metadata or blanket hidden-sender guarantee.
7. **1500–1799 / brand, ink.** Resolve with exact Fluton wordmark and PUBLIC RAILS. PRIVATE ACTIONS., fluton.io. Settle by 1680; hold a clean endpoint. Wrapper supplies TESTNET ONLY · NO REAL FUNDS. Not a loop, no fade that makes the CTA unreadable.

## Motion craft and engineering
Use meaningful action/reaction, contact, occlusion and per-property timing. Integrate one or two causal handoffs; hard editorial cuts are also valid. Do not use the same wipe/punch-in for every scene. Strong energy does not mean everything moves at maximum scale on every beat. Keep enough readable holds and a clear focal action. No decorative particle cloud, habitual glow, generic ribbon or gratuitous camera orbit.

Remotion useCurrentFrame() is the ONLY clock. Actual Framer Motion motion.g/div components and cubicBezier may receive explicit frame-derived values, with initial={false}. No animate/exit/layout/whileInView, setTimeout, Date.now, CSS autoplay/keyframes or rAF simulation. Derive local time from global frame minus scene.startFrame. A frame must look identical after arbitrary seeking/fresh load. Use analytical geometry or fixed seeds, not accumulated physics. SVG projection is fine; don't install 3D/blur packages for a slogan. The frame-derived pattern is not an official integration.

Stage incoming content in local masks. Objects must meet their actual slots/rails; no float-then-vanish shortcut. Never let hidden entering objects leak into captions. Use pure per-frame math and explicit layer order.

## Boundaries and handback
Only edit the paths listed in project AGENTS.md. Do not change facts, timeline, background contract, assets, captions, orchestration or dependencies. No paid services or external asset downloads. No final render or screenshot marathon. If dependencies already exist, run npm run typecheck and node tools/motion.mjs bundle fluton-private-actions; if installation is unavailable, record that honestly.

Fill VISUAL-RETURN.md with scene completion, changed files, any limitations, and checks actually run. Commit on visual/fluton-private-actions and open a PR if tools support it; do not merge. Return the link and a short summary. If a usage limit intervenes, save partial work and list unfinished scenes rather than claiming completion. The orchestrator will render, inspect, align narration, create/mix audio and request only narrowly scoped visual fixes.
