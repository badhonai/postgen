---
name: motion-choreography
description: Causal handoffs, per-property timing, typography and camera choreography for frame-driven showreels.
---

# Choreography, not a list of transitions

Load only after `motion-direction`; respect the current user-authorized scope.

## Planning artifact

When production is authorized, make a state/beat table before composition code:

`event name | start frame | landing frame | readable state | leading object | reaction | persistent identity | sound event | exit/handoff`

Use named cues in one timeline shared by picture and audio. Compute ideal musical beat positions from the original tempo, then round each position individually: `round(n * fps * 60 / bpm)`. Never repeatedly add a rounded beat length; the error accumulates. Musical measures assume a declared time signature, not always 4/4.

## Choose the motion per action

- Start with the job: throw, compress, fold, shear, align, reveal, draw, reframe, or resolve. Choose easing afterward.
- Pick duration from travel, weight, readability and dramatic importance. UI interaction tables are not automatic full-screen film timings.
- Give x/y/rotation/width different curves when the physical interpretation warrants it. A shared brand motion register does not require identical curves on every property.
- Build anticipation and follow-through around selected important actions. Not every title needs a bounce or every object a squash.
- Use unequal reaction offsets where elements answer a lead. Uniform waves remain legitimate when the idea calls for a wave; do not turn a useful anti-template heuristic into another rigid template.
- Keep motion accents hierarchical: small beat reaction, larger phrase event, singular hero event. A big impact on every beat removes contrast.
- Intentional stillness can be powerful. Do not fill every hold with arbitrary drift, grain or wobble.

## Shared-element handoff contract

For every handoff, identify what survives: silhouette, edge, anchor, color role, velocity, orientation, grid or material. Do not hide unrelated scenes behind the same disc repeatedly.

- Reuse world-space coordinates or transform explicitly between local spaces.
- Separate incoming/outgoing content timing from the container morph. Avoid two visible labels occupying the same area.
- For edge-driven stretches, leading and trailing edges may respond at different rates. Check width never becomes negative and radius remains sensible.
- For path morphs, check winding, start point and point correspondence. Equal sample count alone does not prevent a rotating/twisting correspondence.
- A literal one-object film is optional; editorial montage can preserve a construction principle instead.

## Type

- Main message must read at approximately 360 px display width. Remove copy before shrinking it into furniture.
- Use a few deliberate treatments: hard editorial arrival, tracking/width change, baseline mask, or geometry emerging from glyphs. Type-on is for something being written, not every heading.
- Do not move essential copy through its entire reading interval.
- Measure real loaded fonts. Check counters, ascenders, descenders, stroke expansion and mask bounds in full-resolution stills.
- A strong composition may deliberately crop display type, but not essential information by accident.

## Camera and dimensionality

- A camera move should reveal a relationship or redirect attention. Locked-camera object transformations are equally valid.
- If using a shared world, express focal point and zoom on one timeline; use a clear nested transform order: screen-center → scale → negative world focal point. Keep cursor and hit targets in the same world.
- Consider log-space zoom interpolation for long multiplicative zooms; inspect the result rather than treating it as mandatory.
- Build depth through overlap, projection, occlusion, scale and shading before adding expensive lighting effects.
- Use true 3D only if it produces a transformation that cannot be communicated as well in 2D. No obligatory Möbius/ribbon encore.

## Blur

Motion blur belongs to shutter-integrated motion, not as a generic entrance. Sample only the moving passage where useful. Do not average across an intentional hard cut. Remotion's HTML-in-canvas blur is an option only after version/browser compatibility is checked; alpha-layer blur can alter colors. See the deterministic skill for frame-context requirements.

## Provenance

Original project synthesis informed by hughminhphan/motion-kit, LottieFiles/motion-design-skill, whaleyxbt/claude-motion, Liamrjohnston's cinematic-camera skill, and the creator frame studies. Pinned upstream entrypoints and licenses are indexed in `docs/research/source-index.json`; the full research pack is intentionally not bundled. No upstream scripts were executed during collection.
