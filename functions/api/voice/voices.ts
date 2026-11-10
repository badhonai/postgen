import { getUserFromRequest } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import { decryptKey, listVoices, readSettings } from '../../_lib/voice'

type Ctx = { request: Request; env: Env }

/**
 * GET /api/voice/voices — the account's ElevenLabs voices with an
 * `usable_on_api` flag (free plans cannot use library voices through the API).
 * Metadata only: no synthesis, no credits.
 */
export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const user = await getUserFromRequest(ctx.request, ctx.env)
  if (!user) return jsonError('unauthorized', 401)
  const row = await readSettings(ctx.env, user.id)
  if (!row) return jsonError('voice is not configured yet', 404)

  let apiKey: string
  try {
    apiKey = await decryptKey(ctx.env, user.id, row.key_cipher)
  } catch {
    return jsonError('could not read the stored key; save it again', 500)
  }

  const result = await listVoices(ctx.env, user.id, apiKey)
  if ('error' in result) return jsonError(`provider error: ${result.error.message}`, 502)
  return Response.json({
    ...result,
    configured_voice_id: row.voice_id,
  })
}
