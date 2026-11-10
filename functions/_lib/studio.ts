import { serviceClient } from './auth'
import { AgentError } from './agentdb'
import { signAsset } from './signing'
import type { Env } from './env'

/**
 * Studio jobs — the working folder for one film.
 *
 * Files are stored in R2 under `studio/<userId>/<jobId>/<path>` and tracked in
 * `studio_job_files`. A job also holds a **scoped token** (`pgj_live_…`): the
 * visual specialist (Claude) gets that token inside its prompt and can only read
 * and write this one job's files — never the account's posts, drafts or assets.
 */

export type StudioJobRow = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  slug: string
  status: 'open' | 'returned' | 'rendered' | 'archived'
  voice_id: string | null
  voice_name: string | null
  spec: Record<string, unknown>
  note: string
  created_at: string
  updated_at: string
}

export type StudioFileRow = {
  id: string
  job_id: string
  path: string
  kind: 'handoff' | 'return' | 'render' | 'note'
  filename: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

const JOB_STATUSES = ['open', 'returned', 'rendered', 'archived'] as const
const FILE_KINDS = ['handoff', 'return', 'render', 'note'] as const

/** Per-file and per-job budgets: a job folder is working storage, not a video host. */
export const MAX_JOB_FILE = 60 * 1024 * 1024
export const MAX_JOB_BYTES = 400 * 1024 * 1024
export const MAX_JOB_FILES = 400

const db = (env: Env) => serviceClient(env)

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const body = [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 32)
  return `pgj_live_${body}`
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Relative paths only: no absolute paths, no `..`, no backslashes, bounded length. */
export function safePath(input: unknown): string {
  const raw = String(input ?? '').trim().replace(/^\/+/, '')
  if (!raw) throw new AgentError(400, { error: 'path is required (e.g. src/scenes/Intro.tsx)' })
  if (raw.length > 300) throw new AgentError(400, { error: 'path too long' })
  if (raw.includes('\\') || /^[A-Za-z]:/.test(raw)) {
    throw new AgentError(400, { error: 'use forward slashes in path' })
  }
  const parts = raw.split('/')
  if (parts.some((p) => !p || p === '.' || p === '..')) {
    throw new AgentError(400, { error: 'path must not contain empty, "." or ".." segments' })
  }
  if (parts[0] === 'node_modules' || parts[0] === '.git') {
    throw new AgentError(400, { error: 'that folder is not accepted in a job' })
  }
  return parts.join('/')
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'film'
}

export async function createJob(
  env: Env,
  userId: string,
  input: {
    title: string
    projectId?: string | null
    slug?: string
    voiceId?: string | null
    voiceName?: string | null
    spec?: Record<string, unknown>
    note?: string
  },
): Promise<{ job: StudioJobRow; token: string }> {
  const title = String(input.title ?? '').trim()
  if (!title) throw new AgentError(400, { error: 'title is required' })
  if (title.length > 120) throw new AgentError(400, { error: 'title too long (120 chars)' })

  if (input.projectId) {
    const { data: project } = await db(env)
      .from('projects')
      .select('id')
      .eq('id', input.projectId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!project) throw new AgentError(404, { error: 'project not found' })
  }

  const token = randomToken()
  const { data, error } = await db(env)
    .from('studio_jobs')
    .insert({
      user_id: userId,
      project_id: input.projectId ?? null,
      title,
      slug: slugify(input.slug ?? title),
      token_hash: await hashToken(token),
      voice_id: input.voiceId ?? null,
      voice_name: input.voiceName ?? null,
      spec: input.spec ?? {},
      note: input.note ? String(input.note).slice(0, 500) : '',
    })
    .select('*')
    .single()
  if (error || !data) throw new AgentError(400, { error: error?.message ?? 'could not create job' })
  return { job: data as StudioJobRow, token }
}

export type StudioFileSummary = StudioFileRow & { url: string | null; r2_key: string }

export async function listJobFiles(
  env: Env,
  jobId: string,
  origin: string,
): Promise<StudioFileSummary[]> {
  const { data, error } = await db(env)
    .from('studio_job_files')
    .select('id, job_id, path, kind, filename, mime_type, size_bytes, created_at, r2_key')
    .eq('job_id', jobId)
    .order('path')
  if (error) throw new AgentError(500, { error: error.message })
  const rows = (data ?? []) as Array<StudioFileRow & { r2_key: string }>
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      url: await signedUrl(env, row.r2_key, origin),
    })),
  )
}

async function signedUrl(env: Env, key: string, origin: string): Promise<string | null> {
  try {
    const exp = Math.floor(Date.now() / 1000) + 900
    return `${origin}/api/media/${key}?exp=${exp}&sig=${await signAsset(key, exp, env)}`
  } catch {
    return null
  }
}

export async function getJob(env: Env, userId: string, jobId: string) {
  const { data, error } = await db(env)
    .from('studio_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new AgentError(500, { error: error.message })
  if (!data) throw new AgentError(404, { error: 'job not found' })
  return data as StudioJobRow
}

export async function listJobs(env: Env, userId: string, origin: string) {
  const { data, error } = await db(env)
    .from('studio_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new AgentError(500, { error: error.message })
  const jobs = (data ?? []) as StudioJobRow[]
  if (jobs.length === 0) return []
  const ids = jobs.map((j) => j.id)
  const { data: files } = await db(env)
    .from('studio_job_files')
    .select('job_id, path, kind, size_bytes')
    .in('job_id', ids)
  const byJob = new Map<string, { files: number; bytes: number; returned: number }>()
  for (const row of (files ?? []) as Array<{ job_id: string; kind: string; size_bytes: number | null }>) {
    const entry = byJob.get(row.job_id) ?? { files: 0, bytes: 0, returned: 0 }
    entry.files += 1
    entry.bytes += row.size_bytes ?? 0
    if (row.kind === 'return') entry.returned += 1
    byJob.set(row.job_id, entry)
  }
  return jobs.map((job) => {
    const counts = byJob.get(job.id) ?? { files: 0, bytes: 0, returned: 0 }
    return {
      ...job,
      file_count: counts.files,
      total_bytes: counts.bytes,
      return_count: counts.returned,
      project_name: null,
      url: origin ? undefined : undefined,
    }
  })
}

/**
 * Writes one file into the job folder. Re-uploading the same path replaces it,
 * which keeps "send it again" cheap for the specialist.
 */
export async function putJobFile(
  env: Env,
  job: StudioJobRow,
  input: { path: string; kind?: string; file: File },
) {
  const path = safePath(input.path ?? input.file.name)
  const kind = (FILE_KINDS as readonly string[]).includes(String(input.kind))
    ? (input.kind as StudioFileRow['kind'])
    : 'handoff'
  if (input.file.size > MAX_JOB_FILE) {
    throw new AgentError(413, { error: `file too large (max ${MAX_JOB_FILE / 1024 / 1024} MB)` })
  }

  const { count } = await db(env)
    .from('studio_job_files')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', job.id)

  const { data: current } = await db(env)
    .from('studio_job_files')
    .select('id, r2_key, size_bytes')
    .eq('job_id', job.id)
    .eq('path', path)
    .maybeSingle()

  const { data: totals } = await db(env)
    .from('studio_job_files')
    .select('size_bytes')
    .eq('job_id', job.id)
  const used = ((totals ?? []) as Array<{ size_bytes: number | null }>).reduce(
    (n, r) => n + (r.size_bytes ?? 0),
    0,
  )
  const replacing = current ? ((current as { size_bytes: number | null }).size_bytes ?? 0) : 0
  if (used - replacing + input.file.size > MAX_JOB_BYTES) {
    throw new AgentError(413, { error: `job storage budget reached (${MAX_JOB_BYTES / 1024 / 1024} MB)` })
  }
  if (!current && (count ?? 0) >= MAX_JOB_FILES) {
    throw new AgentError(413, { error: `too many files in this job (max ${MAX_JOB_FILES})` })
  }

  const key = `studio/${job.user_id}/${job.id}/${path}`
  await env.MEDIA.put(key, await input.file.arrayBuffer(), {
    httpMetadata: { contentType: input.file.type || 'application/octet-stream' },
  })
  if (current) {
    const oldKey = (current as { r2_key: string }).r2_key
    await db(env).from('studio_job_files').delete().eq('id', (current as { id: string }).id)
    if (oldKey !== key) await env.MEDIA.delete(oldKey)
  }

  const { data, error } = await db(env)
    .from('studio_job_files')
    .insert({
      job_id: job.id,
      user_id: job.user_id,
      path,
      kind,
      filename: input.file.name || path.split('/').pop() || path,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      r2_key: key,
    })
    .select('id, path, kind, filename, mime_type, size_bytes, created_at')
    .single()
  if (error || !data) throw new AgentError(400, { error: error?.message ?? 'could not store file' })

  const status = kind === 'return' ? 'returned' : kind === 'render' ? 'rendered' : job.status
  if (status !== job.status) {
    await db(env).from('studio_jobs').update({ status }).eq('id', job.id)
  }
  return data as StudioFileRow
}

/** Deletes the whole job folder (R2 objects + rows). Used by the "Clear storage" button. */
export async function deleteJob(env: Env, userId: string, jobId: string) {
  const job = await getJob(env, userId, jobId)
  const { data: files } = await db(env)
    .from('studio_job_files')
    .select('r2_key')
    .eq('job_id', jobId)
  for (const row of (files ?? []) as Array<{ r2_key: string }>) {
    await env.MEDIA.delete(row.r2_key)
  }
  const { error } = await db(env).from('studio_jobs').delete().eq('id', job.id).eq('user_id', userId)
  if (error) throw new AgentError(500, { error: error.message })
  return { deleted: jobId, files: (files ?? []).length }
}

export async function deleteJobFile(env: Env, userId: string, jobId: string, fileId: string) {
  const { data: file } = await db(env)
    .from('studio_job_files')
    .select('id, r2_key')
    .eq('id', fileId)
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!file) throw new AgentError(404, { error: 'file not found' })
  await env.MEDIA.delete((file as { r2_key: string }).r2_key)
  const { error } = await db(env).from('studio_job_files').delete().eq('id', fileId)
  if (error) throw new AgentError(500, { error: error.message })
  return { deleted: fileId }
}

export async function updateJob(
  env: Env,
  userId: string,
  jobId: string,
  patch: { title?: string; note?: string; status?: string },
) {
  const job = await getJob(env, userId, jobId)
  const next: Record<string, unknown> = {}
  if (patch.title !== undefined) {
    const title = String(patch.title).trim()
    if (!title) throw new AgentError(400, { error: 'title cannot be empty' })
    next.title = title.slice(0, 120)
  }
  if (patch.note !== undefined) next.note = String(patch.note).slice(0, 500)
  if (patch.status !== undefined) {
    const status = String(patch.status)
    if (!(JOB_STATUSES as readonly string[]).includes(status)) {
      throw new AgentError(400, { error: `status must be one of ${JOB_STATUSES.join(', ')}` })
    }
    next.status = status
  }
  const { data, error } = await db(env)
    .from('studio_jobs')
    .update(next)
    .eq('id', job.id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error || !data) throw new AgentError(500, { error: error?.message ?? 'could not update job' })
  return data as StudioJobRow
}

/**
 * Job-scoped auth for the specialist. Accepts `Authorization: Bearer pgj_live_…`
 * and resolves only that job — deliberately *not* an account API key, so a prompt
 * pasted into another app cannot reach the user's drafts, posts or assets.
 */
export async function requireJobToken(
  request: Request,
  env: Env,
  jobId: string,
): Promise<StudioJobRow> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token.startsWith('pgj_')) {
    throw new AgentError(401, { error: 'missing job token (Authorization: Bearer pgj_live_…)' })
  }
  const { data } = await db(env)
    .from('studio_jobs')
    .select('*')
    .eq('token_hash', await hashToken(token))
    .maybeSingle()
  if (!data) throw new AgentError(401, { error: 'invalid job token' })
  const job = data as StudioJobRow
  if (job.id !== jobId) throw new AgentError(403, { error: 'this token belongs to a different job' })
  return job
}
