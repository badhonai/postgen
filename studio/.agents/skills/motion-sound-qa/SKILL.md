---
name: motion-sound-qa
description: Shared audio/visual cues and evidence-based quality checks, without claiming continuous playback or an independent critic.
---

# Sound, review, delivery

Follow the current brief and authorization in `AGENTS.md`. Documentation/setup work does not authorize a new film or paid service.

## Plan sound with the picture

- Choose a sound role: music-led, UI-led, narrated, or intentionally silent. Do not default every video to the same 128 BPM synth loop.
- Source permission matters: supplied/original/appropriately licensed audio only. Do not lift reference music or interpret a code repository's MIT license as a media license.
- Put picture and sound events in the same named cue table. Re-timing an action must move its sound too.
- Distinguish action start, visual landing and audio transient peak. Place a file by its measured transient, not just its nominal start; any perceptual lead is a deliberate offset, not a universal 30 ms rule.
- Use hierarchy: quiet supporting ticks, a selective movement accent and one meaningful hero sound. Continuous drift need not have continuous whooshes.
- Let anticipation/silence create contrast. Keep tonal effects in a chosen harmonic language; random notes are not a score.
- Select loudness for delivery. −14 or −16 LUFS are useful project targets, not universal mandatory laws. Re-measure the encoded AAC output, including true peak and duration, rather than trusting the source WAV.

## Review gates after authorization

### A. Concept and static design

Write a one-sentence intent and inspect a few key states. Judge hierarchy, material, typography and visual specificity before polishing animation. A weak static composition is not cured by more movement.

### B. Motion

Inspect both macro pacing and consecutive/near-consecutive samples around important events:
- every state transition, not just settled beats;
- opening, anticipation, contact/landing, reveal, climax and final resolution;
- both sides of text/container handoffs;
- frames around a loop seam if a loop is intended.

Check actual movement paths and continuity rather than relying on a single midpoint. Contact sheets do not prove smooth continuous playback. Record exact sampled frames and filenames.

### C. Sound and encode

Check cue alignment against waveform/onsets, loudness, true peak, clipping, channel layout and audio/video stream durations. Technical signal checks do not establish perceived musical quality. If continuous audiovisual listening is unavailable, explicitly leave that as user/human review.

### D. Engineering

Run font/asset checks, deterministic fresh/random/reverse seek comparisons, browser error checks, FFprobe metadata and a full encoded-file decode. Verify the final master, not merely source stills. Confirm exact intended duration and dimensions.

## Critique procedure

For each pass, list the three largest defects with timestamp/frame range, proposed fix and evidence file. Re-inspect the affected render and adjacent frames after changing it. Aesthetic scores are subjective prioritization, not proof of quality. Do not stop merely because a self-assigned score reaches 8.

A genuinely independent critic is useful only when a separate reviewer is actually available. Do not imply that a separate reviewer ran unless one actually did. Never fabricate a fresh critic, signed gate, playback review or sound audition to satisfy an upstream skill.

## User-facing report

Say exactly:
- what was rendered/decoded;
- which images/frames were actually inspected;
- which audio measurements ran;
- what was changed and rechecked;
- what remains unverified.

Preserve earlier exports, ship the editable source and keep credentials out of any archive. Do not call a film perfect or human-reviewed based on sheets and technical checks.

## Provenance

Selective synthesis from whaleyxbt's sound-design/review-loop, howseen-ai's peak-aligned SFX and boundary checks, DeanSPN's music analysis/delivery guidance, and this workspace's QA history. Their particular scripts and score thresholds are not automatically adopted. Optional paid voice/API integrations remain disabled unless separately requested.
