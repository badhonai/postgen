import { requireApiKey } from './apikey'
import { AgentError, type AgentAuth } from './agentdb'
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
