# Orchestrator review 02 — scored cut

## Changes since review 01
- Scene 7: lockup line spacing opened (118 px) and the headline block moved up 18 px; rails/tiles no longer crowd "PRIVATE ACTIONS.".
- Compositing: captions no longer duplicate headlines. Scene 1 reads "Every action leaves a public trace."; the end card has no duplicate caption and keeps only the testnet notice.
- Sound: original score + dry sound design composed from `production/cues.json` (synthesis only), mastered to −14.16 LUFS / −1.8 dBTP.

## Evidence actually gathered
- Picture re-rendered after the change: 1800 frames / 1920×1080 / 60 fps / 30.000 s, full decode, no browser errors, seek-determinism passed.
- Mastered file: video stream copied (no re-encode), full decode passed, exact 30.000000 s, AAC 48 kHz stereo.
- Spectrogram and waveform inspected; no silent gaps over 0.8 s, no clipping, LRA 2.1 LU.
- Encoded frames sampled across the ZK scene confirm the proof/verification sequence survives encoding.

## Not done / limits
- No narration: the requested ElevenLabs voice needs an API key that is not present in this environment. Nothing was synthesized or billed.
- No continuous audiovisual playback or independent human critique; this is frame/spectrum/measurement review.
- Cue times are estimated from inspected visual frames, so accents land within a frame or two of the contacts, not sample-accurately.
