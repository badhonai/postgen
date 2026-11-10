#!/usr/bin/env node
/**
 * Remove stale media from a PostGen project using the agent API.
 *
 *   POSTGEN_API_KEY=pgk_live_… node tools/postgen/cleanup.mjs \
 *     --project <uuid> --match 'voiceover-*.mp3' [--match …] [--keep <name>]… [--confirm]
 *
 * Safe by design:
 *   - nothing is deleted unless it matches a --match glob (and no --keep glob),
 *   - a dry run is the default; deletions need --confirm,
 *   - the API refuses (409) while a post or a saved prompt still references the asset,
 *     so a live draft can never lose its video.
 * The key stays in the environment; nothing is written to disk.
 */
import { listAssets, pg } from './client.mjs'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const many = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []))
const opt = (name) => many(name)[0]

const glob = (pattern) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`)
}

const projectId = opt('--project')
const matches = many('--match').map(glob)
const keeps = many('--keep').map(glob)
const confirm = flag('--confirm')
const all = flag('--all')

if (!projectId || (!matches.length && !all)) {
  console.error(
    'usage: cleanup.mjs --project <uuid> (--match <glob> … | --all) [--keep <glob>]… [--confirm]\n' +
      '  --all deletes every asset in the project that is not --kept and not attached to a post.\n' +
      '  Prefer --match: a project also holds media used by earlier posts.',
  )
  process.exit(2)
}

const { assets = [] } = await listAssets(projectId)
const selected = assets.filter((a) => {
  const name = a.filename ?? a.id
  if (keeps.some((r) => r.test(name))) return false
  return all || matches.some((r) => r.test(name))
})

console.log(
  `${assets.length} asset(s) in project; ${selected.length} selected` +
    (confirm ? '' : ' — DRY RUN (pass --confirm to delete)'),
)

let removed = 0
let kept = 0
for (const asset of selected) {
  const name = asset.filename ?? asset.id
  const size = asset.size_bytes ? `${(asset.size_bytes / 1024 / 1024).toFixed(1)} MB` : '?'
  if (!confirm) {
    console.log(`  would remove ${name} (${asset.mime_type ?? '?'}, ${size})`)
    continue
  }
  try {
    await pg('/api/v1/assets/delete', { method: 'POST', body: JSON.stringify({ asset_id: asset.id }) })
    console.log(`  removed ${name} (${size})`)
    removed++
  } catch (error) {
    if (/\b409\b/.test(error.message)) {
      console.log(`  keep   ${name} — still referenced (${error.message.replace(/^PostGen [^ ]+ → /, '')})`)
      kept++
    } else {
      console.error(`  FAILED ${name}: ${error.message}`)
      process.exitCode = 1
    }
  }
}
console.log(confirm ? `done: ${removed} removed, ${kept} kept` : `dry run: ${selected.length} would be checked`)
