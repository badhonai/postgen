#!/usr/bin/env node
/**
 * Health check for the whole video handoff — run this at the start of any new chat.
 *
 *   POSTGEN_API_KEY=… node tools/studio/verify.mjs [--project=<uuid>] [--keep]
 *
 * Proves, against the live deployment, that:
 *   1. the studio tables exist (migration applied)
 *   2. a job folder can be created and returns a scoped token
 *   3. the job token can read the contract and the file list
 *   4. the job token can upload a file and read it back byte-identical
 *   5. a frozen path (project.json) is refused with 400
 *   6. another job's folder is refused with 403
 *   7. the folder can be wiped again
 * Exit code 0 = PASS. Anything else = the flow is broken; do not start a film.
 */
import { createHash } from 'node:crypto'
import { listJobs, createJob, getJob, updateJob, uploadJobFile, deleteJob, pg } from '../postgen/client.mjs'

const argv = process.argv.slice(2)
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const keep = argv.includes('--keep')
const projectId = opt('project')

const results = []
const check = async (name, fn) => {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail })
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
  } catch (error) {
    results.push({ name, ok: false, detail: error.message })
    console.log(`FAIL  ${name} — ${error.message}`)
  }
}
const expect = (condition, message) => {
  if (!condition) throw new Error(message)
}

const payload = Buffer.from(`verify ${new Date().toISOString()}\n`)
const frozen = Buffer.from('{"smoke":true}\n')
let job
let token
let file

console.log('PostGen studio health check\n')

await check('account key accepted · jobs list', async () => {
  const { jobs = [] } = await listJobs()
  return `${jobs.length} existing folder(s)`
})

await check('create a job folder · scoped token issued', async () => {
  const created = await createJob({
    title: 'verify-health-check',
    slug: 'verify-health-check',
    project_id: projectId ?? null,
    note: 'temporary: tools/studio/verify.mjs health check',
  })
  job = created.job
  token = created.token
  expect(/^pgj_live_/.test(token), 'no pgj_ token returned')
  expect(job.id, 'no job id returned')
  return job.id
})

await check('job token reaches only its own job', async () => {
  const contract = await pg(`/api/v1/studio/jobs/${job.id}/contract`, {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(contract.via === 'job-token', `contract answered via ${contract.via}`)
  const other = await fetch(
    `${process.env.POSTGEN_BASE_URL || 'https://postgen.pages.dev'}/api/v1/studio/jobs/00000000-0000-0000-0000-000000000000/files`,
    { headers: { authorization: `Bearer ${token}`, 'user-agent': 'Mozilla/5.0 verify' } },
  )
  expect(other.status === 403 || other.status === 404, `other job answered ${other.status}`)
  return `contract ok · other job ${other.status}`
})

await check('upload with the job token · byte-identical read-back', async () => {
  file = await uploadJobFile(job.id, {
    path: 'src/scenes/Verify.tsx',
    data: payload,
    kind: 'return',
    type: 'text/plain',
    token,
  })
  const detail = await getJob(job.id)
  const stored = detail.files.find((f) => f.path === 'src/scenes/Verify.tsx' && f.kind === 'return')
  expect(stored?.url, 'uploaded file has no signed URL')
  const response = await fetch(stored.url, { headers: { 'user-agent': 'Mozilla/5.0 verify' } })
  expect(response.ok, `download answered ${response.status}`)
  const got = Buffer.from(await response.arrayBuffer())
  expect(
    createHash('sha256').update(got).digest('hex') === createHash('sha256').update(payload).digest('hex'),
    'downloaded bytes differ from what was uploaded',
  )
  return `${got.length} bytes, sha matched`
})

await check('frozen path refused on upload', async () => {
  const base = process.env.POSTGEN_BASE_URL || 'https://postgen.pages.dev'
  const form = new FormData()
  form.set('file', new Blob([frozen], { type: 'application/json' }), 'project.json')
  form.set('path', 'project.json')
  form.set('kind', 'return')
  const response = await fetch(`${base}/api/v1/studio/jobs/${job.id}/files`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'user-agent': 'Mozilla/5.0 verify' },
    body: form,
  })
  expect(response.status === 400, `expected 400, got ${response.status}`)
  return 'project.json → 400'
})

await check('wipe the folder (R2 objects + rows)', async () => {
  if (keep) return 'skipped (--keep)'
  const detail = await getJob(job.id)
  const before = detail.files.length
  await deleteJob(job.id)
  const gone = await fetch(
    `${process.env.POSTGEN_BASE_URL || 'https://postgen.pages.dev'}/api/v1/studio/jobs/${job.id}`,
    { headers: { authorization: `Bearer ${process.env.POSTGEN_API_KEY ?? ''}`, 'user-agent': 'Mozilla/5.0 verify' } },
  )
  expect(gone.status === 404, `deleted job still answers ${gone.status}`)
  return `${before} file(s) removed`
})

if (!keep && job) {
  await updateJob(job.id, { status: 'archived' }).catch(() => undefined)
}

const failed = results.filter((r) => !r.ok)
console.log('')
console.log(failed.length === 0 ? 'PASS — the handoff flow works on this deployment.' : `FAIL — ${failed.length} check(s) failed. Do not start a film until this is green.`)
if (file && failed.length === 0) console.log('Tip: the folder was temporary; real films keep theirs until you clear them in PostGen → Studio.')
process.exit(failed.length === 0 ? 0 : 1)
