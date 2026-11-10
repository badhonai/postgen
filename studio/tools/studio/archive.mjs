#!/usr/bin/env node
/**
 * Keep a film's working files in the user's PostGen account (no Claude, no handoff).
 *
 *   POSTGEN_API_KEY=… node tools/studio/archive.mjs <slug> --project=<postgen-project-id> \
 *       [--kind=note] [--dry-run]
 *
 * Uploads the brief, script, timing, source and production notes into a studio job
 * folder so the film can be edited later — and the user can clear it from
 * PostGen → Studio whenever they like. The finished video itself is a draft post, not
 * stored here.
 */
import fs from 'node:fs'
import path from 'node:path'
import {ROOT, project} from '../lib.mjs'
import {createJob, uploadJobFile} from '../postgen/client.mjs'

const [slug, ...rest] = process.argv.slice(2)
const opt = Object.fromEntries(
  rest.map((a) => {
    const m = /^--([a-z-]+)=?(.*)$/.exec(a)
    if (!m) throw new Error(`Expected --name=value, received ${a}`)
    return [m[1], m[2] || 'true']
  }),
)
const projectId = opt['postgen-project'] || opt.project
if (!slug || !projectId) {
  console.error('usage: POSTGEN_API_KEY=… node tools/studio/archive.mjs <slug> --project=<uuid> [--kind=note] [--dry-run]')
  process.exit(2)
}

const {dir, spec} = project(slug)
const TEXT = /\.(md|txt|json|tsx?|py|mjs)$/i
const wanted = []
const walk = (rel) => {
  const abs = path.join(dir, rel)
  if (!fs.existsSync(abs)) return
  const stat = fs.statSync(abs)
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(abs).sort()) walk(path.posix.join(rel, name))
    return
  }
  if (!TEXT.test(rel)) return
  if (/node_modules|\.cache/.test(rel)) return
  wanted.push({rel, data: fs.readFileSync(abs)})
}
for (const name of ['project.json', 'assets.json', 'brief.md', 'storyboard.md', 'README.md']) walk(name)
walk('brand')
walk('src')
walk('production')

const total = wanted.reduce((n, f) => n + f.data.length, 0)
console.log(`${wanted.length} files, ${(total / 1024).toFixed(0)} KB`)
if (opt['dry-run']) {
  for (const f of wanted) console.log(`  ${f.rel}`)
  process.exit(0)
}

const alignmentPath = path.join(dir, 'production/narration.alignment.json')
const alignment = fs.existsSync(alignmentPath) ? JSON.parse(fs.readFileSync(alignmentPath, 'utf8')) : null
const {job} = await createJob({
  title: slug,
  slug,
  project_id: projectId,
  voice_id: alignment?.voiceId ?? null,
  voice_name: alignment?.voiceName ?? null,
  spec: {width: spec.width, height: spec.height, fps: spec.fps, durationInFrames: spec.durationInFrames},
  note: `Working files for ${slug}`,
})
for (const file of wanted) {
  await uploadJobFile(job.id, {
    path: file.rel,
    data: file.data,
    kind: opt.kind || 'note',
    type: file.rel.endsWith('.json') ? 'application/json' : 'text/plain',
  })
}
console.log(`archived into job ${job.id} (PostGen → Studio → ${slug})`)
console.log('clear it any time in PostGen → Studio; the draft post keeps the video.')
