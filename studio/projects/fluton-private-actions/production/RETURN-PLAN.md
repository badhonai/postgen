# What the orchestrator does when the visual pass returns

User sends a GitHub PR URL, branch or exact commit. Fetch the ref; do not trust a screenshot or claim that changes were merged.

1. Inspect diff against the prepared main baseline. Only Film.tsx, new visual-system.ts, new scenes/components and VISUAL-RETURN.md are expected. Reject/review changes to facts, timing, assets, wrapper/captions, dependency locks or root tooling separately.
2. Validate 1800 frames / 60 fps / 1920×1080, seven intact ranges, exact supplied logo hashes, actual frame-driven Framer Motion, no wall-clock effects or external asset fetches.
3. Run npm ci if needed, npm test, npm run typecheck, project bundle, then small hard excerpts before a full render. Preserve all previous films.
4. Render states at planned anchors, every scene boundary neighborhood, contacts and clip events. Inspect actual geometry, readable text, contrast, footer cleanliness and first/last frames. Record evidence; no fake playback/critic claims.
5. Arrange the user-selected narration (still pending), align actual recording/captions, author original music/dry effects and mix high-quality PCM. Resolve any timing fit honestly; no unauthorized voice substitution or speed/pitch edits.
6. Render and master full output, decode, check fps/frame count/durations/color/audio/loudness/peak; inspect samples from the encoded final. Explain what was and was not watched/listened to continuously.
7. If visual corrections are needed, send Claude only the few defects with exact frame ranges/screens/evidence and the minimum editable files. Orchestrator can perform routine fixes if the user prefers to conserve further Claude usage.
8. Merge after review, then deliver film/source/captions/post copy if requested. Renders/media stay outside Git. The user controls external publication/spending.

Prepared commands (not a claim these production checks already ran):
```bash
npm run studio -- fluton-private-actions
npm run render -- fluton-private-actions --frames=630-719 --scale=0.5
npm run qa -- fluton-private-actions --frames=630-719
npm run render -- fluton-private-actions
npm run qa -- fluton-private-actions
```
The generic render is a preview/picture path; a narrated PCM master requires the additional final audio workflow described in docs/ASSETS.md.
