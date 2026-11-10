# Setup and runtime restoration

Requirements: Node >=20.19 (22 LTS recommended), npm, Git, FFmpeg/ffprobe. Python 3.11+ is optional for procedural audio/font/image work. A lockfile is not proof that dependencies survived a runtime reset.

```bash
npm ci
npx remotion browser ensure
npm run doctor
npm test
npm run typecheck
npm run build:check
```

Ubuntu 24.04 example (package names differ on older distros):

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 fonts-dejavu-core
```

macOS: install FFmpeg via your package manager and use Remotion's browser ensure. On Windows use supported Node/FFmpeg and an executable on PATH. Only the explicitly recorded environments in VALIDATION.md are tested; these are not claims of cross-platform certification.

Optional Python environment:
```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
```

Keep every @remotion/* version aligned. Current pins: 4.0.542; framer-motion 12.23.24, motion-dom 12.23.23, motion-utils 12.23.6. Upgrade deliberately, not with an unbounded npm install. HyperFrames/GSAP, true 3D and local ASR are optional project choices, not silently installed defaults. Never bulk-install research repositories or paid agent services.

Studio's root runner merges shared public files and project-local public files into excluded cache, then serves the selected entry. It binds for hosted previews; use the host platform's public preview URL, not browser-side localhost URLs for another service. No production artwork depends on a CDN.
