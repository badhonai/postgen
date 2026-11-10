# Assets, font and audio

Shared font: public/fonts/Inter-600.woff2; SIL OFL in the adjacent OFL.txt. The runner merges public/ plus project public/ into cache. A project file can intentionally override a shared path; document that change. Never depend on a hotlinked font being available during capture. The starter uses @remotion/fonts to block capture until the local font is loaded.

Local project assets belong in projects/<slug>/public/ (ignored). The tracked assets.json should list relative filename, original hash, attribution, permission/license and intended role. Do not include owner emails, private source messages or signed URLs. A missing supplied asset must trigger a request or clearly marked placeholder, not a fabricated official asset.

For narration: retain the original file unmodified. Record duration and offset; conform scenes to it. Local ASR is optional and not a human review; correct names and inspect alignment. Voice generation and provider APIs are separately authorized, not starter dependencies.

For music: compose per project or use supplied/licensed material. Avoid canned scores as a universal template. Keep picture and dry accents on one named cue timeline. Use PCM as the final mix source, duck under speech, then encode audio once for the master. Use a lossless stream copy for visual-only corrections where appropriate. Audio files and final masters remain outside Git.

No raw/reference footage, client branding, past narration or creator soundtracks are included in this public starter. A source repository's MIT notice does not grant a license to media it links to. Generated client work and third-party dependencies have their own rights and license requirements.

## Optional final PCM master
```bash
python3 tools/master-audio.py --picture renders/my-film/my-film.mp4 --mix projects/my-film/public/mix.wav --output renders/my-film/my-film-final.mp4
```
The output must differ from both inputs. The tool requires PCM audio, copies the picture, measures two-pass loudness, encodes stereo AAC once, checks frame count/full decode and writes a separate master report. Generic project QA checks its own original render/report; inspect the separate master report and encoded final samples when delivering a mastered file.

## Small GitHub handoff assets (explicit exception)
When a user requests a GitHub-based brand project, essential user-supplied logo PNGs may be committed under projects/<slug>/brand/ (each <=64 KiB), declared in assets.json.bundled with source, publicPath, exact SHA-256 and rights note. The root runner verifies and copies only those declared PNGs to cache/public. This avoids base64 payloads in model context and avoids asking the visual specialist to recreate/download the logo. The exception does not cover narration, photos, raw/reference footage, music, outputs or general trademark rights; normal project public/ media remains ignored.
