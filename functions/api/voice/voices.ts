import { requireApiKey } from '../../_lib/apikey'
import { getUserFromRequest } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import { decryptKey, listVoices, readSettings } from '../../_lib/voice'

type Ctx = { request: Request; env: Env }

/**
 * GET /api/voice/voices — the account's ElevenLabs voices with an
 * `usable_on_api` flag (free plans cannot use library voices through the API).
 * Metadata only: no synthesis, no credits. Accepts a Supabase session OR an agent API key.
 */
export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const bearer = (ctx.request.headers.get('authorization') ?? '').replace(/^Bearer /, '').trim()
  let userId: string
  if (bearer.startsWith('pgk_')) {
    const gate = await requireApiKey(ctx.request, ctx.env)
    if (!gate.ok) return gate.response
    userId = gate.auth.userId
  } else {
    const user = await getUserFromRequest(ctx.request, ctx.env)
    if (!user) return jsonError('unauthorized', 401)
    userId = user.id
  }

  const row = await readSettings(ctx.env, userId)
  if (!row) return jsonError('voice is not configured yet', 404)

  let apiKey: string
  try {
    apiKey = await decryptKey(ctx.env, userId, row.key_cipher)
  } catch {
    return jsonError('could not read the stored key; save it again', 500)
  }

  const result = await listVoices(ctx.env, userId, apiKey)
  if ('error' in result) return jsonError(`provider error: ${result.error.message}`, 502)
  return Response.json({ ...result, configured_voice_id: row.voice_id })
}
