# studio/system — the motion system

Every film in `studio/projects/` is built from this folder, so a new film is a new **script and
a new chapter script**, not a new codebase.

| file | what it owns |
|---|---|
| `motion.ts` | frame maths: `clamp`, `lerp`, `prog`, `settle`/`sp` (critically damped), `ex`, `beatFrames`, `fit`, `hex`, `serial` |
| `tokens.ts` | directions (palette + colour script + type scale) and the `Spec` shape every film's `film-data.json` satisfies |
| `fonts.ts` | the three bundled SIL OFL families: `DISPLAY`, `MONO`, `UI` |
| `type.tsx` | `Words` (a spoken sentence that lights up word by word), `Fig` |
| `primitives.tsx` | `MaskLines`, `Stamp`, `Marquee`, `Rosette`, `Mono` — printed objects, no effects |
| `chrome.tsx` | `FilmChrome`: ground, 7-frame shutter, register hairline, counters, progress rule |

## Rules (the ones that make a film look directed, not generated)
1. **One ground per chapter, cut with a shutter.** No cross-fades, no dissolves.
2. **Words are the animation.** A sentence is on screen for its whole duration; each word lights on
   the frame it is spoken. Never reveal a line before it is said.
3. **Nothing sits still.** Every chapter carries one continuous motion (travelling register,
   appending tree, turning rosette, rolling serial).
4. **Colour is a cut, not decoration.** Full-bleed flips to vermillion/cobalt mark the argument's
   turns; nothing is tinted for prettiness.
5. **Type is fitted, not centred.** `fit()` fills the frame edge; display type is never 40 px.
6. **Springs settle, they do not bounce** (`settle`, `sp`), and eases are quint, not expo tails.
7. **No gradients, glow, blur, particles, RGB split or camera shake.** If a frame needs an effect to
   be interesting, the type or the drawing is wrong.
8. **Every frame is a pure function of the frame number.** No CSS transitions, no timers.
