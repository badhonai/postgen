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

## The commands (no GitHub, no hand-zipping)

```bash
POSTGEN_API_KEY=… npm run ship  -- <slug> --project=<postgen-project-id>  # job folder + prompt
npm run claim -- <slug> --job=<job-id>                    # validate + stage, writes nothing
npm run claim -- <slug> --job=<job-id> --apply --check     # write + bundle
npm run pack  -- <slug>                                    # offline fallback: a local zip
npm run import -- <slug> <returned.zip> --apply --check     # same checks, from a file
```

`ship` creates a **studio job** — a per-film folder in the user's own PostGen account
(R2 `studio/<user>/<job>/…`, tables `studio_jobs` + `studio_job_files`) — uploads the whole
handoff into it and prints one prompt. The specialist receives a **job-scoped token**
(`pgj_…`), not an account key: it can read and write only that job's files, never the user's
posts, drafts or assets. Its entry point is
`GET /api/v1/studio/jobs/{id}/contract`; it uploads each changed file with `kind=return`.

`claim` lists the job, downloads what came back, rebuilds a zip in `.cache/` and runs exactly
the same validation as an offline import — one contract, two doors. Working files stay in the
folder afterwards: the user clears them in **PostGen → Studio**, or keeps them to edit the
film later. Nothing depends on GitHub.

`pack`/`import` still exist for a machine with no network: same allowlist, same refusals.

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
