# Orchestrator-owned sound plan — not audio files

30 seconds; optional original 128 BPM / 4/4 score (16 bars = 30s). Scene/speech semantics take priority over forcing every change onto a beat. Generate beat positions independently from ideal time, not accumulated rounded frames.

Feel: kinetic, precise, confident; a new per-project composition, not the old score pasted in. Dry tuned impacts, tight tonal percussion and a restrained bass/chord motif. No random-noise synthesis or hissing sweep transitions. Keep the speech midrange clear; duck under narration. Use contrast: brief reduction for the boundary explanation, decisive tonal brand resolution, intentional decay through the close.

Planned cue families: public scan tick; intent fold/contact; sealed-value arithmetic clicks; proof latch; note consumption/creation; boundary rail split; final brand landing. Claude should report the exact visual landing frames it implements; the orchestrator will place accents against those contacts rather than just the scene start.

Original recording remains untouched. Narration script is prepared only; voice identity, file and provider are not selected. No paid voice request or billing changes. Once a permitted recording exists, confirm fit/offset, align captions, compose/mix in PCM, then single-encode AAC or copy a verified approved stream for visual-only patches. Measure the actual encoded final output. Target roughly −14 to −16 LUFS and <=−1 dBTP unless delivery rules change; never call this plan a measured mix.

## Status after the visual pass (updated)
The original score has been composed and mastered: `tools/score.py` synthesizes it deterministically from `production/cues.json` (30 s, 128 BPM-family cues at 120 BPM grid, stereo 48 kHz PCM). No samples, third-party music or paid service were used.

**Voice:** the user asked for the same ElevenLabs voice as the Acepyr film (`dmWfLQZJq7wNPv9WmtiM`, "Hope – upbeat and clear"). That requires `ELEVENLABS_API_KEY` in the environment; no such key exists in this workspace and no key was written, logged or requested in chat. **No narration was generated.** The delivered cut is music + sound design with supporting on-screen lines.

**Measured:** picture stream copied unchanged, 1800 frames, 30.000000 s, full decode, −14.16 LUFS integrated, −1.8 dBTP true peak, LRA 2.1 LU.
