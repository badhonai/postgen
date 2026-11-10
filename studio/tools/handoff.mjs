#!/usr/bin/env node
/**
 * The Claude handoff, as a deterministic pair of commands.
 *
 *   node tools/handoff.mjs ship   <id> --project=<postgen-project-id> [--max-mb=25]
 *   node tools/handoff.mjs claim  <id> --job=<job-id> [--apply] [--check]
 *   node tools/handoff.mjs pack   <id> [--out=<file>]        (offline: local zip only)
 *   node tools/handoff.mjs import <id> <file.zip> [--apply] [--check]
 *
 * `ship` stores the handoff in the user's own PostGen account as a **studio job**
 * folder (not GitHub, not a local zip) and prints one prompt to paste into Claude.
 * `claim` reads the returned files back from that folder, validates them against the
 * same contract and imports them. Nothing has to be emailed or unzipped by hand.
 *
 * `pack` builds ONE archive for the visual specialist: the recorded narration (the
 * timing source of truth), the frozen timing/contract files, the current source as a
 * baseline and a generated prompt. File set, hashes and byte-for-byte output are
 * reproducible, and nothing that could hold a credential is included.
 *
 * `import` takes the ZIP back and refuses anything the specialist does not own:
 * only scenes, components, Film.tsx, visual-system.ts and VISUAL-RETURN.md are
 * accepted. Timeline, composition, project.json and the audio can never be edited by
 * a returned archive — a change there has to be described, not shipped.
 */
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {ROOT,project} from './lib.mjs'
import {readZip,writeZip,sha256,describe} from './zip.mjs'

const CONTRACT_VERSION = 1
const EDITABLE = [/^src\/Film\.tsx$/,/^src\/visual-system\.ts$/,/^src\/scenes\/[A-Za-z0-9._-]+\.tsx$/,/^src\/components\/[A-Za-z0-9._-]+\.tsx$/,/^VISUAL-RETURN\.md$/]
/** Never editable, and named explicitly so the refusal can explain itself. */
const FROZEN = {
 'project.json':'canvas, fps and duration are derived from the recorded voice',
 'src/film-data.json':'scene windows and caption copy come from the narration alignment',
 'src/timeline.ts':'timeline types are owned by the orchestrator',
 'src/Composition.tsx':'background, captions and clip order are owned by the orchestrator',
 'src/index.tsx':'entry/composition registration is owned by the orchestrator',
 'package.json':'dependencies need an explicit decision, not a ZIP',
 'package-lock.json':'lockfile changes are never accepted from a handoff',
}
const SECRET_PATTERNS = [
 ['GitHub token',/github_pat_[A-Za-z0-9_]{20,}/],
 ['GitHub token',/gh[pousr]_[A-Za-z0-9]{30,}/],
 ['PostGen agent key',/pgk_live_[A-Za-z0-9_-]{10,}/],
 ['ElevenLabs-style key',/sk_[A-Za-z0-9]{32,}/],
 ['OpenAI/Anthropic-style key',/sk-[A-Za-z0-9_-]{20,}/],
 ['AWS access key',/AKIA[0-9A-Z]{16}/],
 ['private key block',/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],
 ['credential in URL',/https:\/\/[^\s/@:]+:[^\s/@]+@/],
 ['bearer token',/Bearer\s+[A-Za-z0-9._-]{24,}/],
]
const TEXT = /\.(?:md|txt|json|ts|tsx|js|mjs|css|ya?ml)$/i

const log = (...a) => console.log(...a)
const fail = (message) => {
  console.error('handoff: ' + message)
  process.exit(1)
}
const option = (args, name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

/** Collects the pack list by allowlist, so renders/caches/media can never slip in. */
function collect(dir) {
  const out = []
  const add = (rel) => {
    const abs = path.join(dir, rel)
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return
    out.push({name: rel, data: fs.readFileSync(abs)})
  }
  const addTree = (rel, filter = () => true) => {
    const abs = path.join(dir, rel)
    if (!fs.existsSync(abs)) return
    for (const entry of fs.readdirSync(abs, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.posix.join(rel, entry.name)
      if (entry.isDirectory()) addTree(child, filter)
      else if (filter(child)) add(child)
    }
  }

  for (const name of ['project.json','assets.json','brief.md','storyboard.md','README.md']) add(name)
  addTree('brand', (f) => /\.png$/i.test(f))
  addTree('src', (f) => /\.(?:tsx?|json)$/i.test(f))
  for (const name of [
    'production/voiceover.txt',
    'production/voice-timeline.json',
    'production/narration.alignment.json',
    'production/narration.mp3',
  ]) add(name)

  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

function scanSecrets(files) {
  const hits = []
  for (const {name, data} of files) {
    if (!TEXT.test(name)) continue
    const text = data.toString('utf8')
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(text)) hits.push(`${name}: looks like a ${label}`)
    }
    if (/^\.env/.test(path.basename(name))) hits.push(`${name}: env files are never packed`)
  }
  return hits
}

function prompt({id, spec, voice}) {
  const seconds = (spec.durationInFrames / spec.fps).toFixed(2)
  const fence = '```'
  return [
    `# Your job: the visuals for "${id}"`,
    '',
    `You are the visual specialist on a ${seconds} s film (${spec.width}×${spec.height}, ${spec.fps} fps,`,
    `${spec.durationInFrames} frames). The narration is **already recorded**: production/narration.mp3`,
    `(${voice ?? 'default voice'}). The picture bends to that performance — never the reverse.`,
    '',
    'Read first: HANDOFF.json (frozen files + hashes), src/film-data.json (scene windows and caption',
    'copy, derived from the character alignment), src/timeline.ts, src/Composition.tsx, then the',
    'existing scenes and components.',
    '',
    '## What you may change',
    'src/Film.tsx, src/visual-system.ts, src/scenes/*.tsx, src/components/*.tsx.',
    '',
    '## What you must not change',
    'project.json, src/film-data.json, src/timeline.ts, src/Composition.tsx, src/index.tsx,',
    'package.json, the lockfile, brand/, production/. Scene ids and frame windows are the timing',
    'agreement; if one is genuinely wrong, describe the change in VISUAL-RETURN.md — the',
    'orchestrator applies it. An import containing any of these files is rejected.',
    '',
    '## How to return it',
    'One ZIP containing only:',
    fence,
    'src/Film.tsx',
    'src/visual-system.ts',
    'src/scenes/*.tsx          (new or changed)',
    'src/components/*.tsx      (new or changed)',
    'VISUAL-RETURN.md',
    fence,
    'No package.json, no lockfile, no public/, no audio, no renders, no node_modules, no whole-project',
    'copy. VISUAL-RETURN.md states: scenes completed, the actual contact/landing frames (the',
    'orchestrator places sound accents on them), what you checked and how, known limitations, and any',
    'frozen file you believe blocks you (proposal only).',
    '',
    '## Craft rules',
    'Frame-derived motion only — every value is a function of the frame, no CSS transitions or rAF.',
    'Design for the largest legible idea per scene, safe areas respected, captions never collide with',
    'art. Original mechanisms per film; dry/tonal accents, no hissing sweeps. Keep the supplied logos',
    'byte-identical. Nothing on screen may claim more than the brief allows.',
    '',
  ].join('\n')
}

function visualReturnTemplate({id}) {
  return `# VISUAL-RETURN — ${id}

## Scenes completed
| scene id | frames | what changed |
|---|---|---|
|  |  |  |

## Contact / landing frames
Frame numbers where a visual event lands (the orchestrator puts sound accents here):
- 

## Checks I actually ran
- [ ] rendered stills at every cut and contact frame
- [ ] typecheck / bundle
- describe anything you could not run:
`
}

/** Builds the archive in memory — shared by pack (local) and ship (PostGen job folder). */
function buildPack(id, {maxMb = 25} = {}) {
  const {dir, spec} = project(id)
  const files = collect(dir)
  if (!files.some((f) => f.name === 'production/narration.mp3')) {
    fail('no production/narration.mp3 — the flow is voice-first; generate the voice (tools/postgen/voice.mjs) before packing visuals.')
  }

  const secrets = scanSecrets(files)
  if (secrets.length) fail('refusing to ship credentials:\n  ' + secrets.join('\n  '))

  const total = files.reduce((n, f) => n + f.data.length, 0)
  if (total > maxMb * 1024 * 1024) fail(`pack is ${(total / 1024 / 1024).toFixed(1)} MB, over --max-mb=${maxMb}.`)

  const alignmentPath = path.join(dir, 'production/narration.alignment.json')
  const alignment = fs.existsSync(alignmentPath)
    ? JSON.parse(fs.readFileSync(alignmentPath, 'utf8'))
    : undefined
  const voice = alignment
    ? alignment.voiceName
      ? `${alignment.voiceName} (${alignment.voiceId})`
      : alignment.voiceId
    : undefined

  const locked = {}
  for (const [name, why] of Object.entries(FROZEN)) {
    const abs = path.join(dir, name)
    if (fs.existsSync(abs)) locked[name] = {sha256: sha256(fs.readFileSync(abs)), why}
  }

  const manifest = {
    contractVersion: CONTRACT_VERSION,
    project: {id: spec.id, compositionId: spec.compositionId, entry: spec.entry},
    spec: {width: spec.width, height: spec.height, fps: spec.fps, durationInFrames: spec.durationInFrames},
    voice: voice ?? null,
    editable: ['src/Film.tsx','src/visual-system.ts','src/scenes/*.tsx','src/components/*.tsx','VISUAL-RETURN.md'],
    locked,
    maxArchiveMb: maxMb,
  }

  const entries = [
    {name: 'HANDOFF.json', data: Buffer.from(JSON.stringify(manifest, null, 2) + '\n')},
    {name: 'CLAUDE-PROMPT.md', data: Buffer.from(prompt({id: spec.id, spec, voice}))},
    {name: 'VISUAL-RETURN.md', data: Buffer.from(visualReturnTemplate({id: spec.id}))},
    ...files,
  ]

  return {dir, spec, entries, manifest, voice, zip: writeZip(entries)}
}

/** Offline path: one local ZIP. `ship` is the normal flow. */
async function pack(args) {
  const id = args[0]
  if (!id) fail('usage: handoff.mjs pack <id> [--out=<file>] [--max-mb=25]')
  const {zip, voice, entries} = buildPack(id, {maxMb: Number(option(args, 'max-mb') ?? 25)})
  const out = option(args, 'out') ?? path.join(ROOT, 'renders', id, `${id}-handoff.zip`)
  fs.mkdirSync(path.dirname(out), {recursive: true})
  fs.writeFileSync(out, zip)
  log(`packed ${entries.length} entries, ${(zip.length / 1024 / 1024).toFixed(2)} MB`)
  log(`  ${out}`)
  log(`  sha256 ${sha256(zip)}`)
  log(`  voice  ${voice ?? 'none'}`)
  log(`  prefer: node tools/handoff.mjs ship ${id} --project=<postgen-project-id>`)
}

/**
 * Stores the handoff in the user's PostGen account (a studio job folder) and prints
 * the one prompt the user pastes into Claude. The prompt carries a job-scoped token
 * (`pgj_…`) that can only touch this job's files — never the account key.
 */
async function ship(args) {
  const id = args[0]
  const projectId = option(args, 'project')
  if (!id || !projectId) fail('usage: handoff.mjs ship <id> --project=<postgen-project-id> [--max-mb=25]')
  const jobs = await import('./postgen/client.mjs')

  const {entries, manifest, voice, zip} = buildPack(id, {maxMb: Number(option(args, 'max-mb') ?? 25)})
  const created = await jobs.createJob({
    title: id,
    slug: id,
    project_id: projectId,
    voice_id: manifest.voice ? String(manifest.voice).replace(/^.*\(([^)]+)\)$/, '$1') : null,
    voice_name: voice ?? null,
    spec: manifest.spec,
  })
  const job = created.job

  let uploaded = 0
  for (const entry of entries) {
    await jobs.uploadJobFile(job.id, {
      path: entry.name,
      data: entry.data,
      kind: 'handoff',
      type: entry.name.endsWith('.mp3') ? 'audio/mpeg' : undefined,
    })
    uploaded++
  }
  await jobs.uploadJobFile(job.id, {
    path: 'handoff.zip',
    data: zip,
    kind: 'handoff',
    type: 'application/zip',
  })

  const base = process.env.POSTGEN_BASE_URL || 'https://postgen.pages.dev'
  const promptText = claudePrompt({id, base, jobId: job.id, token: created.token, voice, spec: manifest.spec})

  const promptFile = option(args, 'prompt-file')
  if (promptFile) {
    fs.mkdirSync(path.dirname(promptFile), {recursive: true})
    fs.writeFileSync(promptFile, promptText)
  }

  log(`job ${job.id} — ${uploaded + 1} files in your PostGen account (Studio → ${id})`)
  log('')
  log('─'.repeat(72))
  log('PASTE THIS IN CLAUDE:')
  log('─'.repeat(72))
  log(promptText)
  log('─'.repeat(72))
  log('')
  log('When Claude says it is done, run:')
  log(`  node tools/handoff.mjs claim ${id} --job=${job.id} --apply --check`)
  log('Clear the working files later in PostGen → Studio (or keep them to edit the video).')
}

/** The copy-paste prompt: everything Claude needs, including how to get and return files. */
function claudePrompt({id, base, jobId, token, voice, spec}) {
  const seconds = (spec.durationInFrames / spec.fps).toFixed(2)
  return [
    `You are the visual specialist for a ${seconds} s motion film ("${id}", ${spec.width}x${spec.height}, ${spec.fps} fps, ${spec.durationInFrames} frames).`,
    `The narration is already recorded${voice ? ` (${voice})` : ''}. The picture follows that performance.`,
    '',
    'Everything you need is in a private job folder in my PostGen account. Use this job token — it',
    'only unlocks this one job, so it cannot see or change anything else of mine:',
    '',
    `  BASE URL:  ${base}`,
    `  JOB ID:    ${jobId}`,
    `  TOKEN:     ${token}`,
    '',
    '1) Read the contract (file list, which paths you may write, what is frozen):',
    `   curl -s -H "Authorization: Bearer ${token}" ${base}/api/v1/studio/jobs/${jobId}/contract`,
    '',
    '2) Download the handoff files (the JSON lists them with short-lived signed URLs; fetch the',
    '   ones you need — narration.mp3, src/**, film-data.json, HANDOFF.json, CLAUDE-PROMPT.md):',
    `   curl -s -H "Authorization: Bearer ${token}" ${base}/api/v1/studio/jobs/${jobId}/files`,
    '',
    '3) Build the film to the recorded voice. Only these paths may change:',
    '   src/Film.tsx, src/visual-system.ts, src/scenes/*.tsx, src/components/*.tsx, VISUAL-RETURN.md',
    '   Frozen (do not touch): project.json, src/film-data.json, src/timeline.ts, src/Composition.tsx,',
    '   src/index.tsx, package.json, brand/**, production/**',
    '',
    '4) Upload what you changed, one file per request, as kind=return:',
    `   curl -s -X POST -H "Authorization: Bearer ${token}" \\`,
    `     -F "file=@src/scenes/Intro.tsx" -F "path=src/scenes/Intro.tsx" -F "kind=return" \\`,
    `     ${base}/api/v1/studio/jobs/${jobId}/files`,
    '   Include VISUAL-RETURN.md: scenes done, contact/landing frames, checks you actually ran, limits.',
    '',
    '5) When everything is uploaded, reply "done". I render it and post the draft.',
    '',
    'Rules: frame-derived motion only (no CSS transitions/rAF), captions never collide with art,',
    'keep supplied logos byte-identical, do not claim more than the brief allows.',
  ].join('\n')
}

/**
 * Reads the returned files back out of the job folder, validates them against the
 * same contract as a local ZIP, and imports them.
 */
async function claim(args) {
  const id = args[0]
  const jobId = option(args, 'job')
  if (!id || !jobId) fail('usage: handoff.mjs claim <id> --job=<job-id> [--apply] [--check]')
  const jobs = await import('./postgen/client.mjs')

  const detail = await jobs.getJob(jobId)
  const returned = detail.files.filter((f) => f.kind === 'return' && f.path !== 'handoff.zip')
  if (returned.length === 0) {
    fail(
      `job ${jobId} has no returned files yet (status: ${detail.job.status}).\n` +
        '  Claude uploads each changed file with kind=return; if it already said "done", check the job in Studio.',
    )
  }

  const entries = []
  for (const file of returned) {
    const data = await jobs.downloadJobFile(file)
    entries.push({name: file.path, data})
  }
  const zipPath = path.join(ROOT, '.cache', id, 'return', `${id}-return.zip`)
  fs.mkdirSync(path.dirname(zipPath), {recursive: true})
  fs.writeFileSync(zipPath, writeZip(entries))
  log(`pulled ${entries.length} returned file(s) from job ${jobId}`)

  await importZip([id, zipPath, ...args.filter((a) => a.startsWith('--') && a !== '--job')])
}

function classify(name) {
  if (EDITABLE.some((re) => re.test(name))) return 'editable'
  if (FROZEN[name]) return 'frozen'
  return 'unknown'
}

async function importZip(args) {
  const [id, zipPath] = args
  if (!id || !zipPath) fail('usage: handoff.mjs import <id> <file.zip> [--apply] [--check]')
  const {dir,spec} = project(id)
  if (!fs.existsSync(zipPath)) fail(`no such file: ${zipPath}`)

  let files
  try {
    files = readZip(fs.readFileSync(zipPath))
  } catch (error) {
    fail(error.message)
  }

  const rows = [...files.keys()].sort()
  const editable = []
  const problems = []
  for (const name of rows) {
    const kind = classify(name)
    if (kind === 'editable') editable.push(name)
    else if (kind === 'frozen') problems.push(`${name}: frozen — ${FROZEN[name]}`)
    else problems.push(`${name}: not part of the return contract`)
  }

  if (!editable.some((n) => n !== 'VISUAL-RETURN.md')) {
    fail('the ZIP contains no editable source (src/Film.tsx, src/visual-system.ts, src/scenes, src/components).')
  }
  if (problems.length) {
    fail('refusing this archive — it changes things the specialist does not own:\n  ' + problems.join('\n  ') +
      '\n  Describe the needed change in VISUAL-RETURN.md instead; the orchestrator applies it.')
  }

  const staged = path.join(ROOT, '.cache', id, 'import')
  fs.rmSync(staged, {recursive: true, force: true})
  for (const name of rows) {
    const target = path.join(staged, name)
    fs.mkdirSync(path.dirname(target), {recursive: true})
    fs.writeFileSync(target, files.get(name))
  }

  // Drift check: the specialist should have built on the base we packed.
  const handoffRaw = files.get('HANDOFF.json')
  if (handoffRaw) {
    const manifest = JSON.parse(handoffRaw.toString('utf8'))
    if (manifest.contractVersion !== CONTRACT_VERSION) log(`note: contract v${manifest.contractVersion}, this orchestrator speaks v${CONTRACT_VERSION}`)
    for (const [name, info] of Object.entries(manifest.locked ?? {})) {
      const abs = path.join(dir, name)
      const current = fs.existsSync(abs) ? sha256(fs.readFileSync(abs)) : null
      if (current && current !== info.sha256) log(`note: ${name} changed since the pack — recheck that the scenes still fit the timing`)
    }
    const specNow = [spec.width, spec.height, spec.fps, spec.durationInFrames]
    const specThen = [manifest.spec.width, manifest.spec.height, manifest.spec.fps, manifest.spec.durationInFrames]
    if (specNow.join('x') !== specThen.join('x')) fail('the returned archive targets a different canvas/fps/duration than project.json.')
  }

  log(`${rows.length} entries accepted, ${editable.length} into the project:`)
  for (const name of editable) log(`  ${name}`)

  if (!args.includes('--apply')) {
    log(`staged in ${path.relative(ROOT, staged)} (nothing written to the project yet)`)
    log(`apply with: node tools/handoff.mjs import ${id} ${zipPath} --apply${args.includes('--check') ? ' --check' : ''}`)
    return
  }

  const changed = []
  for (const name of rows) {
    const target = path.join(dir, name)
    const next = files.get(name)
    const before = fs.existsSync(target) ? fs.readFileSync(target) : null
    if (before && before.equals(next)) continue
    fs.mkdirSync(path.dirname(target), {recursive: true})
    fs.writeFileSync(target, next)
    changed.push(`${before ? 'updated' : 'added'} ${name}`)
  }
  log(changed.length ? 'applied:\n  ' + changed.join('\n  ') : 'applied: no file changed')

  if (args.includes('--check')) {
    log('bundling…')
    execFileSync(process.execPath, [path.join(ROOT, 'tools/motion.mjs'), 'bundle', id], {cwd: ROOT, stdio: 'inherit'})
    log('next: node tools/motion.mjs still ' + id + ' --frame=<cut>  →  render → qa')
  }
}

async function main() {
  const [action, ...rest] = process.argv.slice(2)
  try {
    if (action === 'pack') await pack(rest)
    else if (action === 'import') await importZip(rest)
    else if (action === 'ship') await ship(rest)
    else if (action === 'claim') await claim(rest)
    else fail('usage: handoff.mjs <ship|claim|pack|import> …')
  } catch (error) {
    fail(error.message)
  }
}

main()
