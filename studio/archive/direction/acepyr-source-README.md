# ACEPYR — THE GAP

Independent voice-led explainer, **54 seconds · 1920×1080 · 60 fps · 3240 frames**.

This is a new Acepyr production, not another Fluton edit. It uses the user's supplied Acepyr mark and downloaded narration, an original tonal beat/dry accents, twelve narrative scenes and burned-in captions.

## Start / preview

Requires Node.js LTS, Python 3, FFmpeg/ffprobe and Chrome Headless Shell's Linux libraries (libnss3, libnspr4, fontconfig; fonts-dejavu-core for labelled sheets).

```bash
npm ci --ignore-scripts --no-audit --no-fund
npx remotion browser ensure
mkdir -p tmp/acepyr .cache/acepyr exports
npx remotion studio src/acepyr/index.tsx --port=3000 --no-open
```

The included `public/acepyr/preview-mix.m4a` is ready for preview, along with generated outlines, assets and captions. No voice provider, API key or new speech generation is required. Render/QA scripts bundle only this film's public assets; they do not depend on earlier projects.

## Render / master

The final master uses a regenerated PCM mix, not a second encode of the preview AAC.

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-acepyr.txt
mkdir -p tmp/acepyr .cache/acepyr exports
python scripts/score-acepyr.py
node scripts/qa-acepyr.cjs
node scripts/render-acepyr.cjs final
python scripts/master-acepyr.py
python scripts/contact-acepyr.py
```

Final film: `exports/acepyr-the-gap-54s.mp4`. Heavy intermediates and bundles stay under `.cache/acepyr/`; evidence stays in `tmp/acepyr/`.

The renderer explicitly selects `swangle`, PNG frame capture and BT.709 conversion; H.264 CRF 18 / medium is used for the picture. The default master copies that video stream and encodes the PCM audio once to AAC. For a visual-only correction, `python scripts/master-acepyr.py --audio-from path/to/approved-film.mp4` instead copies the approved AAC stream and verifies that every packet payload hash is unchanged. Do not use the output path as its own audio input. Remotion 4.0.542 and Framer Motion 12.23.24 are pinned; keep the lockfile and matching motion-dom/motion-utils versions.

## Edit the film

- `src/acepyr/Acepyr.tsx`: all artwork, layouts and frame-derived motion. Twelve independent passages: opposing signals, two lenses, blind ballot, private/public contrast, token choices, illustrative example, physical gap, feedback, convergence requirements, ongoing trading, paired takeaway and brand payoff.
- `src/acepyr/timeline.json`: dimensions/rate, chapters and shared sound cues. Voice starts at 0.25 seconds; its speed/pitch are not changed.
- `src/acepyr/captions.json`: caption segments aligned from the supplied recording.
- `src/acepyr/glyphs.json`: Anton/Inter SVG outlines. Regenerate with `python scripts/prepare-acepyr.py` when changing phrases/captions. Add any new phrase to the preparation script's labels before referencing it.
- `public/acepyr/`: original supplied narration MP3, exact logo PNG, fonts/OFL notices, preview audio and provenance.
- `scripts/score-acepyr.py`: original 144 BPM tonal music, dry editorial accents, voice level/EQ and music ducking. No synthesized noise sweeps, sampled soundtrack or paid generator. The narration performance is user-supplied.
- `acepyr/`: brief, source checks, original script, supplied-voice provenance and local automatic transcript/alignment.

Actual Remotion provides time/rendering. Actual Framer Motion `motion.g` components receive numeric frame-derived transforms and Bézier easing. Token depth is custom orthographic projected SVG geometry—not Three.js. There is no wall-clock animation or CSS keyframe timeline.

## Optional local voice realignment

The supplied alignment/captions are already included. Realignment changes captions only; replacing the narration also requires manually conforming scene anchors and the fixed 54-second duration. Only if intentionally replacing the alignment (back it up first):

```bash
python -m pip install -r requirements-acepyr-asr.txt
python scripts/align-acepyr.py --overwrite
python scripts/prepare-acepyr.py
```

This uses local faster-whisper tiny.en; public model weights download into excluded cache. FFmpeg-decoded float PCM is passed directly to the model, avoiding a PyAV-version-dependent decoding argument. Audio is not uploaded to a transcription service. Automatic transcription is not a human listening review; inspect timings and brand spelling before mastering.

## Truth, rights and review boundaries

Official docs say Belief Tokens are planned, not live. Individual votes are private; the running share is public. Money share means YES's share of combined YES/NO market value, not a probability or a count of traders. Consensus needs closeness, the same side of 50%, time and minimum participation; precise thresholds are not invented. Trading continues and agreement is not proof. All illustrated numbers/claims are labelled examples, not live data or screenshots.

The exact supplied 400×400 mark is retained unchanged; the typed ACEPYR label is supporting text, not a recreated official wordmark. Font licenses and asset provenance are retained. The user-provided recording's filename labels it “Hope — upbeat and clear”; it is not represented as an independently verified Emma performance. No additional ElevenLabs synthesis was used after the upload. No API key/account metadata/temporary signed download URL is included.

See `exports/acepyr-the-gap-build-notes.md` for final encoded-file checks and review limits. Stills, transcript alignment and signal measurements do not establish uninterrupted audiovisual listening/viewing or an independent critic's approval.

`SOURCE-MANIFEST.json` hashes each archive payload, not itself. The ZIP excludes the final film, credentials, older projects, browser binaries, node_modules, model weights and regenerable bundles. Use `scripts/package-acepyr.py` to rebuild the archive after generating its evidence.

## User correction — top-slot insertion / full-bleed background
Ballots align with the top slot at (1361.5, 409), descend vertically, and are progressively occluded at its plane; the near lip remains in front. Three complete insertion cycles fit within the vote scene. Captions and the small illustrative-data notice now sit directly over the scene background, using light text on dark scenes and dark text on cream. There is no solid bottom caption rectangle. These are visual-only corrections; the approved final AAC was copied unchanged.
