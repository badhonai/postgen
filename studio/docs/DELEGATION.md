# Optional split: orchestrator + visual specialist (ZIP return)

Default is solo. Use this only when the user asks for it. No paid service is called automatically, and
the specialist never sees a provider key: narration arrives as an audio file.

## Ownership
| Work | Orchestrator | Visual specialist |
|---|---|---|
| Intake, facts, script, voice generation, captions timing | Owns | — |
| Project skeleton, timeline data, composition wrapper, assets | Owns | Reads only |
| Scenes, components, visual system, frame-driven motion | Reviews + narrow fixes | Owns |
| Score, mix, master, render, QA, delivery | Owns | — |

## What the specialist returns
**One ZIP**, containing only:

```
src/Film.tsx
src/visual-system.ts
src/scenes/**            (new or changed)
src/components/**        (new or changed)
VISUAL-RETURN.md
```

No `package.json`, no lockfile, no `public/`, no audio, no renders, no `node_modules`, no whole-project
copy. `VISUAL-RETURN.md` lists: scenes completed, actual contact/landing frames (for sound accents),
checks actually run, limitations, and any locked file it believes is blocking (proposed change only).

## The two commands (do this instead of hand-zipping)

```bash
npm run pack -- <slug>                      # → renders/<slug>/<slug>-handoff.zip
npm run import -- <slug> <returned.zip>      # validate + stage, writes nothing
npm run import -- <slug> <returned.zip> --apply --check   # write + bundle
```

`pack` allowlists the archive (spec, brief/storyboard, `src/**` baseline, brand PNGs,
`production/voiceover.txt`, `voice-timeline.json`, `narration.alignment.json` and the
**recorded** `narration.mp3`), refuses to run when the narration is missing, scans every
text file for credential shapes, and pins entry timestamps so the same inputs produce the
same bytes — the archive is reviewable by sha256. It also writes `HANDOFF.json` (frozen
files with hashes), `CLAUDE-PROMPT.md` (the contract) and a `VISUAL-RETURN.md` skeleton.

`import` reads the returned ZIP with a minimal reader that rejects absolute paths, `..`,
backslashes, symlinks, duplicates and decompression bombs, then refuses the whole archive
if it contains anything outside the editable list — naming each frozen file and why it is
frozen. Accepted files are staged in `.cache/<slug>/import/`; `--apply` copies them into
the project, `--check` then bundles with Remotion. It also warns when a frozen file
changed since the pack (the specialist built on a stale base).

## Orchestrator import rules
1. Unzip into the existing project on a branch; refuse any path outside the list above
   (`npm run import` does this mechanically — do not unzip by hand).
2. `npm run typecheck` + bundle; reject dependency/asset/timeline edits.
3. Render stills at every cut and contact; inspect them; fix cheap defects in-house.
4. Send Claude only narrow notes: frame range, what's wrong, evidence, allowed files.
5. Merge only after the encoded master passes QA.

## Why ZIP and not a branch
Claude cannot always write to GitHub. A ZIP is one message, reviewable, and contains no credentials.
PostGen's MCP is for narration and posting — not for shipping source.
