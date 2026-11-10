# Validation of this rebuild

Executed locally, not hypothetical instructions:

- Node 20.20.2 / npm 10.8.2 / FFmpeg + ffprobe 7.1.5 on the supplied Linux sandbox. Node 22 is configured for CI; other operating systems are not certified here.
- `npm ci`, browser ensure and OS runtime restoration completed.
- Six built-in Node tests passed: safe IDs/paths, spec/frame ranges, option rejection, independent generator/no-overwrite, 12 pinned research sources and repeatable source fingerprints.
- `npm run typecheck` passed.
- `npm run build:check` bundled the starter successfully.
- `npm run doctor` found required executables/font/dependencies. This inventory alone is not rendering proof.
- Starter render smoke: 12 frames / 60 fps / 480×270 / 0.200s; encoded metadata and full decode passed. No audio is expected in the starter.
- Frame 450 after future/reverse seeking and in a fresh browser matched; sampled browser errors were empty. Explicit swangle was used.
- Studio bound to 0.0.0.0:3000 and returned HTTP 200 with a hosted-preview Host header. This is a server/entry smoke, not exhaustive UI testing.
- Temporary generated audio fixture: 60 frames / 1s picture / stereo AAC 48 kHz; full decode and encoded measurement passed. Generic container duration was 1.003s (AAC padding); production exact-duration requirements need the final master check.
- Optional PCM master fixture: video copied without another encode; exact 1.000000s container, 60 frames, full decode, −14.05 LUFS / −13.15 dBTP measured.
- Changing source after a render triggered the expected stale-render rejection. Temporary test project/media are not tracked.
- Public-tree checks examine tracked/index content for forbidden paths/media, >1 MiB files, known credential patterns and Markdown links. This is not a comprehensive security audit or history scrub.

These are engineering fixtures, not a newly commissioned film. No uninterrupted creative AV viewing/listening, independent critic or broad third-party code security audit is claimed. Research source counts and old production lessons remain historical, not claims of executing all those repositories. GitHub Actions is configured separately; local passes do not imply a remote CI run has finished.
