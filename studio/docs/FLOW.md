# The flow: voice first → Claude imagines the visuals → orchestrator renders → PostGen post

> Lives at `studio/docs/FLOW.md` in the PostGen repo (the standalone motion-graphics repo is retired).
> Voice ids allowed on our plan: Liam `TX3LPaxmHKxFdv7VOQHJ` (default), George `JBFqnCBsd6RMkjVDRZzb`,
> Laura `FGY2WhTYpPnrIDTdsKH5`, Jessica `cgSgspJ2msm6clMCkdW9`. No library/professional voices.

This replaces the old "picture first, sound later" order for **any film that has narration**.
Solo films without narration keep the lightweight path in [WORKFLOW.md](WORKFLOW.md). PostGen is the
system of record for narration and delivery.

```
1 INTAKE        ask the fixed question set (docs/INTAKE.md) — never assume
2 RESEARCH      orchestrator verifies facts, rights, assets; writes script + brief
3 VOICE         PostGen generate_voiceover (Liam by default) → mp3 + character alignment  ← paid, capped
4 SHIP          handoff.mjs ship → a studio job folder in the user's PostGen account
                (voice, brief, timing, source) + one prompt to paste into Claude
5 VISUALS       Claude reads the folder via the job's scoped token, builds to the actual
                audio, uploads only its changed scenes back into the same folder
6 REVIEW        handoff.mjs claim → validate against the contract, import, render, inspect
7 FINAL         score + mix + master; QA on the encoded final
8 DELIVER       upload MP4 to PostGen → DRAFT post (type: post) with caption; user publishes
   STORAGE      working files stay in the job folder; the user clears them in
                PostGen → Studio whenever they like (or keeps them to edit later)
```

The user's whole job is three steps — see [AGENT-PROMPT.md](AGENT-PROMPT.md).

## 1 · Intake (always)
Ask these before work starts, in one message, with sensible defaults so a one-word reply is enough:

1. **Subject/project** and the one thing a viewer must remember.
2. **Platform + aspect** (16:9 feed, 9:16 vertical, 1:1) and where it will be posted.
3. **Duration** — a target, or "voice decides".
4. **Narration** — voice (default **Liam** `TX3LPaxmHKxFdv7VOQHJ`; switch with `PUT /api/voice/settings`), language, or silent.
5. **Supplied assets** — exact logos/files; where they are; permission to use them.
6. **Claims allowed / forbidden** — anything that must not be said (testnet status, no metrics…).
7. **Who renders** — solo, or the split with Claude.
8. **Delivery** — PostGen project id, caption style, draft vs approved.

## 2 · Research (orchestrator)
Verify factual claims against authoritative sources and record links; list what must not be claimed;
confirm asset rights; write `production/FACT-CHECK.md`, `production/voiceover.txt` and the brief. The
script is **final before any voice is generated** — voice is the most expensive step and is capped.

## 3 · Voice (orchestrator, via PostGen)
The ElevenLabs key lives only in PostGen (Settings → Voiceover, encrypted). It is never in this repo,
never in a project file, never in chat.

```bash
POSTGEN_API_KEY=… node tools/postgen/voice.mjs <slug> \
  --postgen-project=<uuid>            # dry run: prints script + length, spends nothing
POSTGEN_API_KEY=… node tools/postgen/voice.mjs <slug> \
  --postgen-project=<uuid> --confirm  # spends 1 generation (20/day, 2 per identical script)
```

Writes `production/narration.mp3`, `production/narration.alignment.json` (character timings for
captions) and a copy of the exact script used. If a generation sounds wrong, edit the script — an
edited script is a new script and gets its own 2 attempts.

## 4 · Handoff (orchestrator)
Create the project skeleton and freeze everything Claude must not touch:

- `project.json` (dimensions, fps, frames derived from the audio), `assets.json`, `brand/`
- `src/film-data.json` — scene windows, copy, palette, safe areas
- `src/Composition.tsx` (background + captions + clip) — **owned by the orchestrator**
- `production/` — script, alignment, fact-check, cue plan
- `AGENTS.md`, `CLAUDE-HANDOFF.md`, `CLAUDE-PROMPT.md`
- the **audio** itself: Claude listens to `production/narration.mp3` (or a copy in `public/`)

Claude receives the ZIP-return contract in [DELEGATION.md](DELEGATION.md): scenes only.
Build the bundle, never by hand:

```bash
npm run pack -- <slug>        # renders/<slug>/<slug>-handoff.zip (deterministic, secret-scanned)
```

## 5 · Visuals (Claude)
Claude listens to the real performance, imagines the film live against it, and implements
`src/scenes/**`, `src/components/**`, `src/Film.tsx`, `src/visual-system.ts`. Scene boundaries and
copy come from `film-data.json`. It returns **one ZIP** containing only those files plus
`VISUAL-RETURN.md` with the actual landing frames it implemented.

## 6 · Review (orchestrator)
Import the ZIP on a branch, check the diff scope, render stills at every cut and contact, inspect them,
fix cheap defects locally, and only send Claude narrow notes (frame range + evidence + allowed files).

## 7 · Final (orchestrator)
Score and sound design from `production/cues.json` (`tools/score.py`), mix narration + music to PCM,
master once (`tools/master-audio.py`), then measure the encoded final: duration, frame count, decode,
LUFS/true peak, and inspect encoded samples.

## 8 · Deliver (orchestrator → PostGen)
```bash
POSTGEN_API_KEY=… node tools/postgen/post.mjs <slug> \
  --postgen-project=<uuid> --video=renders/<slug>/<slug>-final.mp4
```
Uploads the MP4 to PostGen's private storage and creates a **draft** post with
`production/post-caption.txt`. You approve/publish in the app. **No ZIP, MP4 or WAV is committed to
this repo** — PostGen holds the delivered video.

## What must never happen
- A voice generated from a draft script, or re-rolled without asking.
- The ElevenLabs key in a file, commit, log, screenshot or chat message.
- Claude returning whole-project ZIPs, dependencies, renders or audio.
- A film delivered as "done" without inspecting the encoded output.
- Publishing a post yourself (drafts only) or claiming a render that never ran.

## Troubleshooting the voice step

| Symptom | Cause | Fix |
|---|---|---|
| HTTP **403 + Cloudflare "Error 1010"** | Bot filter rejects requests with no browser UA | the helpers send a browser `User-Agent`; if you call the API yourself, set one (or `POSTGEN_USER_AGENT`) |
| **502** `Free users cannot use library voices via the API` | ElevenLabs **free** plan refuses `professional`/`library` voices over the API; only `premade`/`cloned` work | `--list-voices` shows which are usable, then `--voice=<id>`; or upgrade the plan |
| **400** `voice is not configured` | no key saved in PostGen → Settings → Voiceover | save the key there (never here) |
| **409** `script already generated` | 2 attempts per identical script per 24h | edit the script (edits are a new script) |
| **429** `daily voiceover limit reached` | 20 successes/day | wait for the next UTC day |

Always let the helper's **preflight** run: it validates key, plan, voice and caps for free, and refuses to
spend when the provider would reject the voice anyway.
