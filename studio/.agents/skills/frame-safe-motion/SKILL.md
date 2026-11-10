---
name: frame-safe-motion
description: Honest Remotion and Framer Motion integration contract, deterministic seeking, blur, 3D and loop validation.
---

# One clock: Remotion's frame

This is an application-level compatibility playbook. It does not independently authorize a new film.

## Verified platform constraint

Remotion's official third-party integration page says it does not currently provide a Framer Motion integration. All rendered motion must derive from `useCurrentFrame()` or an integration that synchronizes to that timeline.

Sources:
- https://www.remotion.dev/docs/third-party
- https://motion.dev/docs/react-motion-component
- https://www.remotion.dev/docs/three
- https://www.remotion.dev/docs/motion-blur/html-in-canvas-motion-blur
- https://www.remotion.dev/docs/motion-blur/common-mistake

## This project's acceptable approach

Use Remotion as the authoritative time and media/render system. Framer Motion's pure easing utilities and motion components can consume **explicit numeric, frame-derived values**. Keep entry animation disabled (`initial={false}`) and do not delegate motion timing to `animate`, `exit`, `layout`, `whileInView`, timers or a browser rAF.

This describes an application-level, test-required pattern, not an official supported bridge or the full Framer Motion autoplay feature set. Importing `motion.div` alone is not evidence that animation craft improved. The starter demonstrates the tested frame-derived component/easing pattern; do not describe it as an official integration.

For any uncertain behavior, compare fresh render, sequential seek and random seek of the same frame. If browser scheduling affects the result, the approach is not acceptable for export. A paused explicit seekable timeline is a separate option, not permission to mix clocks.

## Determinism contract

- Output state is a pure function of frame, fixed assets, props and declared seeds.
- No cumulative integration, live requestAnimationFrame simulation, Date.now or unseeded randomness.
- Bake physics/simulation once or solve it analytically. State-dependent simulation cannot simply be restarted in arbitrary worker order.
- Load fonts and assets before capture; do not depend on hotlinked production assets.
- Fractional frames must work if subframe blur is enabled. Do not quantize geometry unnecessarily.
- In nested Remotion Sequences, distinguish local frame from global timeline explicitly.
- For R3F, use the documented Remotion canvas integration and assign frame-derived transforms rather than advancing animation with R3F's `useFrame()` loop.

## Package discipline

Keep the existing lockfile and exact Remotion package version 4.0.542 unless a deliberate upgrade is requested and tested. Keep `framer-motion@12.23.24`, `motion-dom@12.23.23` and `motion-utils@12.23.6`; their previous floating dependency mismatch broke bundling.

Match any added `@remotion/*` package to the core version. Inspect package scripts and APIs before installing. Do not execute downloaded projects merely because they appear in the research index. Package files do not prove dependencies/system libraries survived a runtime reset.

## Blur context and browser requirements

A component that samples time must call `useCurrentFrame()` **inside** a Remotion blur provider's child subtree. Passing already-computed parent-frame positions into every sample will not create proper shutter blur.

Official guidance describes `HtmlInCanvasMotionBlur` as available since 4.0.529, with browser support conditions for preview and nested canvases. Version-number compatibility is not proof that the current browser supports every feature. Test a small authorized excerpt first. The older alpha-composited CameraMotionBlur can alter colors; inspect rather than wrapping the entire film by habit.

## Loops: position equality is not enough

For a periodic function over duration T, the intended conditions are state(T) = state(0) and, where appropriate, velocity(T) = velocity(0). Test neighborhood frames across the seam and the audio tail/head.

The last stored frame occurs at T − 1/fps, not at T. A natural periodic animation does not generally require that stored frame to be byte-identical to frame zero. Forcing the last sample to zero can introduce a duplicate frame or a velocity discontinuity. Do not present an endpoint PNG hash as comprehensive seamless-loop proof.

## Later production verification

After authorization: inspect environment → run type/bundle check → render a short excerpt → random/reverse/fresh seeks → inspect transition neighborhoods → decode the encoded output. Treat historical benchmark findings as workload-specific. Run a new heavy benchmark only when authorized, with the same workload and clearly recorded machine/runtime settings.
