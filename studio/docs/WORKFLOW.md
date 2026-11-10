# Repeatable workflow, original results

> **Narrated films use [FLOW.md](FLOW.md)**: script → voice (PostGen) → Claude visual ZIP → render →
> PostGen draft post. The steps below remain the solo path and the design/QA detail for both.

## 1. Scope and facts
Confirm the message, audience, platform, format, duration, narration and supplied assets. Ask only consequential missing questions. Record verified claims and links, rights, prohibited treatments and budget. Never invent product status or user credentials. If a supplied performance exceeds a rough duration target, agree how to conform it; do not silently speed it up.

## 2. Three concepts, not three palettes
Write three short candidates. Each must have a visual mechanism, one-sentence story, signature payoff, reference principle and feasibility/risk. Compare an editorial system, persistent-object world or material transformation when appropriate—not as mandatory categories. Recommend one and explain the rejections. Use the user's approval process without imposing unnecessary pauses if the request already authorizes end-to-end production.

## 3. New project and design system
`npm run new -- slug` creates a separate folder and refuses to overwrite one. Fill its brief, asset manifest and scene plan. Set dimensions/fps/frames in project.json; defaults are just fixture settings. Define palette roles, type scale, safe areas, material rules, focal hierarchy, motion register and density. Design a few static states first. Do not cure a weak composition by adding motion.

## 4. Storyboard and cues
Use frame-based start/landing/readable/exit events in storyboard.md or a project timeline.json. Put sound peaks and visual contacts in the same named table. Introduce genuinely different content-specific ideas through the film. Alternate movement scale and density; stillness is allowed. For BPM b and fps f, round each ideal beat separately: round(n*f*60/b), not repeated additions of a rounded beat.

## 5. Implement, prove, expand
Remotion is authoritative time. Use the direction, choreography and frame-safe skills. Test a small hard excerpt before building expensive 3D/blur. Use actual supplied assets, local preloaded fonts, fixed seeds and explicit frame-derived values. Distinguish local Sequence time from global time. No wall-clock animations for capture.

## 6. Sound and captions
Select silent/music/UI/narrated mode deliberately. Music must be original, supplied or licensed. Default to dry/tonal accents rather than hissing sweeps; don't reuse a fixed BGM as every new video's identity. Narration remains user-selected; paid generation is opt-in. Align captions, then inspect spelling/timing. Keep captions clear without an unwanted solid bottom bar. Separate scene-content clipping from background fill.

For narrated work, keep original audio untouched, build a high-quality PCM mix and master it once. Generic Remotion render is a picture/preview path; a dedicated final PCM master may be needed. See ASSETS and QA.

## 7. Review/correct loop
Run engineering checks and inspect source states plus transition/contact neighborhoods. List the three largest defects with frame ranges, evidence and fix. Re-render affected and adjacent samples. Check masks/occlusion, labels, safe area, caption contrast, crop and mobile-size legibility. Then inspect encoded samples and run full decode/audio measurements. Never invent independent review or continuous listening.

## 8. Deliver, then start fresh
Deliver the actual final film, permitted editable source/asset list, captions/post copy if requested and a review/reproduction note. Preserve previous projects. Keep big media local or use an explicitly authorized storage/release workflow; don't commit them to this source repo. For the next film, create another project and repeat concept selection—not a find/replace of the last video.
