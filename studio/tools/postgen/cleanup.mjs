#!/usr/bin/env node
/**
 * Remove stale media from a PostGen project using the agent API.
 *
 *   POSTGEN_API_KEY=pgk_live_… node tools/postgen/cleanup.mjs \
 *     --project <uuid> [--keep <filename>]... [--dry-run]
 *
 * Defaults to a dry run. An asset is skipped when:
 *   - its filename is in --keep (the delivered master), or
 *   - PostGen answers 409 because a post still uses it.
 * The key stays in the environment; nothing is written to disk.
 */
import { listAssets, pg } from './client.mjs'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const opt = (name) => {
  const i = argv.indexOf(name)
  return i === -1 ? undefined : argv[i + 1]
}
const keep = argv.flatMap((a, i) => (a === '--keep' ? [argv[i + 1]] : []))
const projectId = opt('--project')
const dryRun = flag('--dry-run') || !flag('--confirm')

if (!projectId) {
  console.error('usage: cleanup.mjs --project <uuid> [--keep <filename>]… [--confirm] [--dry-run]')
  process.exit(2)
}

const { assets = [] } = await listAssets(projectId)
console.log(`${assets.length} asset(s) in project ${projectId}${dryRun ? ' — DRY RUN' : ''}`)

let removed = 0
let kept = 0
for (const asset of assets) {
  const name = asset.filename ?? asset.id
  if (keep.includes(name)) {
    console.log(`  keep   ${name}`)
    kept++
    continue
  }
  if (dryRun) {
    console.log(`  would remove ${name} (${asset.mime_type ?? '?'}, ${asset.size_bytes ?? '?'} B)`)
    continue
  }
  try {
    await pg('/api/v1/assets/delete', {
      method: 'POST',
      body: JSON.stringify({ asset_id: asset.id }),
    })
    console.log(`  removed ${name}`)
    removed++
  } catch (error) {
    if (/\b409\b/.test(error.message)) {
      console.log(`  keep   ${name} (attached to a post)`)
      kept++
    } else {
      console.error(`  FAILED ${name}: ${error.message}`)
      process.exitCode = 1
    }
  }
}
console.log(dryRun ? `dry run: ${kept} kept, nothing deleted` : `done: ${removed} removed, ${kept} kept`)
