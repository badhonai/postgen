# Creative Taste and Reference Study

This file defines how an AI agent should learn the visual direction for this workspace. The goal is to develop a consistent creative language for the user's motion graphics, not to reproduce another creator's work.

## Reference-first workflow

Before designing a new video:

1. Inspect every usable video, image, storyboard, and note in `reference/`.
2. If references are missing, ask the user to add them or provide links. Do not pretend to have studied references that are not available.
3. Watch each reference in full when possible. Do not judge a video from its thumbnail alone.
4. Record observations in a short project-specific analysis before creating the first draft.
5. Translate observations into original design decisions that fit the user's message, identity, and project.

For online references, use only sources the user is permitted to access. Follow platform terms and copyright restrictions. Do not use yt-dlp to bypass access controls or DRM.

## What to study

For each reference, analyze:

### Pacing and structure
- Overall duration and information density.
- Hook timing and how quickly the central idea becomes clear.
- Average shot and scene length.
- Rhythm changes, pauses, emphasis, and transitions.
- How the ending resolves the message or creates a loop.

### Captions and typography
- Caption placement, line length, hierarchy, and reading speed.
- Font character, weight, size, and contrast.
- Word-by-word emphasis, highlighted phrases, and kinetic type.
- Safe margins for mobile and platform UI.
- How captions work with the speaker and other visual elements.

### Colour and art direction
- Dominant and supporting colours.
- Background treatment, contrast, gradients, texture, and lighting.
- Colour used to signal hierarchy, emotion, or brand identity.
- Consistency across scenes and transitions.

### Motion language
- Entry and exit behavior.
- Easing curves, overshoot, spring behavior, and motion blur.
- Camera movement, parallax, depth, and scale changes.
- Shape transitions, masking, layering, and compositing.
- Whether motion supports meaning or merely decorates the frame.

### Sound and editing
- Music mood, energy, and beat relationship.
- Sound effects and transition accents.
- Voice clarity, loudness consistency, and silence.
- Cuts and visual changes synchronized to speech or music.

## Build an original style, not a copy

- Extract general principles, not exact sequences, layouts, assets, scripts, or signature compositions.
- Do not recreate another creator's video frame-for-frame.
- Do not reuse copyrighted music, footage, logos, or artwork without permission.
- Combine reference insights with the user's own subject, message, brand assets, and creative direction.
- Make each visual choice serve the content. Avoid generic AI-video aesthetics, random effects, excessive transitions, and decorative motion without purpose.

## Preserve the user's identity

The user's information, voice, brand, and projects are the source of truth.

- Preserve the user's wording, opinions, terminology, and intended tone when editing their scripts.
- Do not invent personal facts, credentials, experiences, project claims, partnerships, metrics, or endorsements.
- Do not replace the user's voice with generic marketing language.
- Use brand names, logos, colours, fonts, and assets only when supplied or explicitly approved.
- Do not infer missing brand rules from a reference creator's identity.
- If identity details are missing or ambiguous, keep the design neutral and ask before inventing them.
- Keep separate projects and brands visually distinct unless the user asks for a shared system.

## Reference analysis note template

For each reference, record:

- **Source:** filename or URL
- **Format:** duration, aspect ratio, resolution, frame rate (if known)
- **Pacing:** hook, scene rhythm, pauses, ending
- **Captions:** placement, typography, emphasis, timing
- **Colour:** palette, contrast, background treatment
- **Motion:** transitions, easing, camera, kinetic elements
- **Sound:** voice, music, effects, synchronization
- **Reusable principles:** abstract techniques worth learning
- **Do not copy:** distinctive elements that should remain unique to the source
- **Application:** how the principles could support the user's current project

Store analysis notes under `reference/analysis/` using descriptive filenames. Keep the original reference assets unchanged.
