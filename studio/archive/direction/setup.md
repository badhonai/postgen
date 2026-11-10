# Toolchain Setup

This repository uses five tools for the motion-graphics workflow:

| Tool | Responsibility |
|---|---|
| Remotion | Build and render programmatic videos with React |
| HyperFrames | Create HTML/GSAP-based motion-graphics compositions |
| FFmpeg / FFprobe | Cut, transcode, inspect, and export media |
| OpenAI Whisper | Transcribe speech and generate caption files |
| yt-dlp | Download permitted reference media for analysis |

This guide installs project dependencies locally wherever possible. FFmpeg is a system executable and must be installed through the operating system package manager or supplied as a local binary. Do not assume a package installed on the agent host is available in every future runtime.

## Requirements

- Node.js 22 or newer. This satisfies HyperFrames and is suitable for the Remotion toolchain.
- npm, included with Node.js.
- Python 3.10 or 3.11 recommended for the Whisper environment.
- FFmpeg and FFprobe available on `PATH`.
- Git.

Check the base environment:

```bash
node --version
npm --version
python3 --version
git --version
```

If Node.js is older than 22, upgrade it before continuing.

## 1. Install Remotion and HyperFrames in this repository

Run from the repository root. Do not run `create-video` at the repository root because the scaffolder may reject an existing Git repository. Install the packages into this repository instead:

```bash
npm init -y
npm install --save-exact remotion @remotion/cli react react-dom hyperframes
```

Keep Remotion packages on matching versions. When adding more `@remotion/*` packages, use the same exact version as the installed `remotion` package.

Verify the CLIs:

```bash
npx remotion --version
npx hyperframes --help
```

A successful version/help response confirms the package CLIs can start. It does not yet prove a composition can render. Before declaring the full toolchain ready, create and render a minimal test composition with each renderer that will be used.

Optional agent skills, when the active coding agent supports them:

```bash
npx skills add remotion-dev/skills
npx skills add heygen-com/hyperframes
```

Only install agent skills if the command is supported and the user approves any additional project changes they introduce.

## 2. Install FFmpeg and FFprobe

FFmpeg is an operating-system dependency, not a normal npm package. Install it using the appropriate method for the host.

### Ubuntu / Debian

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

### macOS with Homebrew

```bash
brew install ffmpeg
```

### Windows with winget

```powershell
winget install Gyan.FFmpeg
```

Verify both executables:

```bash
ffmpeg -version
ffprobe -version
```

If the agent has no administrator access, use an approved preinstalled binary or a user-local FFmpeg build and add its `bin` directory to `PATH`. Do not silently substitute a different encoder.

## 3. Install OpenAI Whisper in a local Python environment

### Ubuntu / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -U openai-whisper
```

### Windows PowerShell

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install -U openai-whisper
```

Whisper requires FFmpeg to be installed and discoverable on `PATH`. PyTorch may take time to install and the first transcription may download a model. The first model download requires network access.

Verify the CLI:

```bash
whisper --help
```

Then run a short transcription against a permitted local audio sample:

```bash
whisper path/to/short-audio.wav --model tiny --output_format srt --output_dir exports
```

Use a real sample path. Do not report the transcription test as passed if no audio file was available.

## 4. Install yt-dlp in the same Python environment

Activate `.venv` first, then run:

```bash
python -m pip install -U "yt-dlp[default]"
yt-dlp --version
```

Use yt-dlp only for media the user owns, has permission to download, or is otherwise legally permitted to access. Respect the source platform's terms, copyright, privacy, and access controls. Do not bypass DRM, paywalls, login restrictions, or technical protections.

## 5. End-to-end verification

Run these checks from the repository root:

```bash
node --version
npx remotion --version
npx hyperframes --help
ffmpeg -version
ffprobe -version
source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1
whisper --help
yt-dlp --version
```

The shell activation line differs on Windows as shown above.

### Required test report

The agent must report a status table with:

| Component | Verification | Status |
|---|---|---|
| Remotion | CLI starts and a minimal composition renders | Pass / Fail / Blocked |
| HyperFrames | CLI starts and a minimal composition previews or renders | Pass / Fail / Blocked |
| FFmpeg | `ffmpeg -version` and a short test encode succeed | Pass / Fail / Blocked |
| Whisper | CLI starts and a permitted short sample produces an SRT | Pass / Fail / Blocked |
| yt-dlp | Version check succeeds; optional metadata test on a permitted public reference | Pass / Fail / Blocked |

Do not mark the setup complete based only on package installation or version output. Run actual smoke tests. If a test needs a sample asset, network access, a browser, GPU, or elevated permissions that are unavailable, mark it **Blocked** and state exactly what is missing.

## Repository hygiene

- Keep npm dependencies in `package.json` and `package-lock.json`.
- Keep Python dependencies isolated in `.venv/`; never commit the virtual environment.
- Add `.venv/`, `node_modules/`, caches, temporary renders, and model files to `.gitignore`.
- Do not commit downloaded reference videos or large exports unless explicitly requested.
- Keep original user assets in `raw/` and final deliverables in `exports/`.
- Never claim all five tools work until every required smoke test has passed.

## Official references

- Remotion: https://www.remotion.dev/docs/
- HyperFrames: https://hyperframes.app/docs/1-startup/2-quickstart
- FFmpeg: https://ffmpeg.org/download.html
- OpenAI Whisper: https://github.com/openai/whisper
- yt-dlp installation: https://github.com/yt-dlp/yt-dlp/wiki/Installation
