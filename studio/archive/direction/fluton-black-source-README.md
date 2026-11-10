# FLUTON — Black edition, 37.5 seconds

Requested revision: 30–45 seconds, a black theme, stronger visuals and the approved BGM without the hissing transition sounds.

**Composition:** 1920×1080 · 60 fps · 2250 frames · 37.5 s. The earlier 15-second film was preserved separately.

## Preview

Requires Node.js LTS, FFmpeg/ffprobe, and Chrome Headless Shell's Linux shared libraries (libnss3, libnspr4, fontconfig; fonts-dejavu-core for labelled review sheets).

```bash
npm ci --ignore-scripts --no-audit --no-fund
npx remotion browser ensure
mkdir -p tmp/fluton-black .cache/fluton-black exports
npx remotion studio src/fluton-black/index.tsx --port=3000 --no-open
```

Generated outlines, embedded exact supplied logos and the extended original WAV are included. No asset regeneration or model API is required just to preview/render.

## Render / master

```bash
node scripts/qa-fluton-black.cjs
node scripts/render-fluton-black.cjs final
python3 scripts/master-fluton-black.py
```

The render/QA scripts explicitly choose Chromium's `swangle` backend. This fixed a small SVG raster-edge discrepancy found when comparing repeated seeks with the environment's default backend. The output is an actual BT.709 render, not only a metadata relabel.

Master: `exports/fluton-black-37.5s.mp4`. Intermediates/bundles: `.cache/fluton-black/`. Verification records: `tmp/fluton-black/`.

## Edit or regenerate assets / music

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-fluton-black.txt
mkdir -p tmp/fluton-black .cache/fluton-black exports
python scripts/prepare-fluton-black.py
python scripts/score-fluton-black.py
node scripts/render-fluton-black.cjs states
node scripts/render-fluton-black.cjs strips
node scripts/qa-fluton-black.cjs
node scripts/render-fluton-black.cjs final
python scripts/master-fluton-black.py
python scripts/contact-fluton-black.py
```

- `src/fluton-black/FlutonBlack.tsx`: artwork, layouts, frame-derived motion, custom projection and final exact-logo docking.
- `timeline.json`: rate, duration, chapter starts and named sound/visual cues.
- `glyphs.json`: generated Inter 900/600 outlines. Add new phrases to the preparation script before referencing them in the component; font filenames alone do not select a variable-font weight.
- `assets.json`: generated data-URI references to the supplied logo faces and depth-only masks.
- `public/fluton-black/`: actual images/fonts, OFL notice, provenance, original WAV and asset/audio-change notes.
- `score-fluton-black.py`: twenty-bar extension of the approved BGM's motif, groove and instruments. No transition sweeps, reverse-noise/inhale sounds, random noise synthesis, external samples or paid API. Quiet pitched cues and a dry tonal rim replace the former noisy transition/percussion elements.

Actual Remotion 4.0.542 supplies time and rendering. Actual Framer Motion 12.23.24 supplies `motion.g` with numeric frame-derived styles and Bézier easing. No wall-clock animation, CSS keyframes, Three.js claim or hidden paid generator. This is a resolved film, not a seamless-loop deliverable.

## Rights and review boundary

White supplied logo fronts are unchanged. The wordmark's left 512×512 pixels were checked to match the separate supplied mark exactly, permitting a precise docking transition. Supplied Fluton branding remains subject to the owner's rights; it is not generally licensed by a package's metadata. Inter's SIL OFL notice is included. Remotion and other dependency licenses remain separate.

The bars, planes, gates and proof strokes are conceptual graphics, not actual encrypted execution/proof receipts or an invented product dashboard.

See `exports/fluton-black-build-notes.md` for the final film's metadata, decoded samples and technical audio checks. Frame inspection and loudness measurements are not uninterrupted audiovisual watching/listening or an independent critic review.

The archive excludes the final movie, older work, credentials, node_modules, browser binaries, references and heavy regenerable bundles. `SOURCE-MANIFEST.json` records all payload hashes (not its own). Packaging is optional via `scripts/package-fluton-black.py`.
