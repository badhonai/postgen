import { requireApiKey } from './apikey'
import { AgentError, type AgentAuth } from './agentdb'
import { getJob, requireJobToken, type StudioJobRow } from './studio'
import { jsonError, type Env } from './env'

/**
 * Shared guard for /api/v1/* routes:
 * API-key auth + rate limit + AgentError → JSON mapping.
 */
export async function agentRoute(
  request: Request,
  env: Env,
  fn: (auth: AgentAuth) => Promise<Response>,
): Promise<Response> {
  const gate = await requireApiKey(request, env)
  if (!gate.ok) return gate.response
  try {
    return await fn(gate.auth)
  } catch (e) {
    if (e instanceof AgentError) return Response.json(e.body, { status: e.status })
    return jsonError('internal error', 500)
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>
    }
    throw new Error('not an object')
  } catch {
    throw new AgentError(400, { error: 'expected a JSON object body' })
  }
}

/**
 * Route guard for job folders: accepts **either** an account API key (`pgk_…`,
 * the owner) **or** the job's own scoped token (`pgj_…`, the visual specialist).
 * A job token can only ever reach the job it was issued for.
 */
export async function studioRoute(
  request: Request,
  env: Env,
  jobId: string,
  fn: (job: StudioJobRow, via: 'owner' | 'job-token') => Promise<Response>,
): Promise<Response> {
  const header = request.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  try {
    if (bearer.startsWith('pgj_')) {
      const job = await requireJobToken(request, env, jobId)
      return await fn(job, 'job-token')
    }
    const gate = await requireApiKey(request, env)
    if (!gate.ok) return gate.response
    const job = await getJob(env, gate.auth.userId, jobId)
    return await fn(job, 'owner')
  } catch (e) {
    if (e instanceof AgentError) return Response.json(e.body, { status: e.status })
    return jsonError('internal error', 500)
  }
}
