import { requireApiKey } from '../../_lib/apikey'
import { getUserFromRequest } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import {
  changeVoice,
  deleteSettings,
  readSettings,
  saveSettings,
  status,
  validateVoice,
} from '../../_lib/voice'

type Ctx = { request: Request; env: Env }

/** Default narration voice for every project until the user picks another. */
const DEFAULT_VOICE_ID = 'TX3LPaxmHKxFdv7VOQHJ' // Liam — Energetic, Social Media Creator
const MAX_KEY_LENGTH = 200

/** Accepts a signed-in web session or an agent API key (pgk_live_…). */
async function requireUser(ctx: Ctx): Promise<{ userId: string | null; response: Response | null }> {
  const bearer = (ctx.request.headers.get('authorization') ?? '').replace(/^Bearer /, '').trim()
  if (bearer.startsWith('pgk_')) {
    const gate = await requireApiKey(ctx.request, ctx.env)
    if (!gate.ok) return { userId: null, response: gate.response }
    return { userId: gate.auth.userId, response: null }
  }
  const user = await getUserFromRequest(ctx.request, ctx.env)
  if (!user) return { userId: null, response: jsonError('unauthorized', 401) }
  return { userId: user.id, response: null }
}

/** Status only — never returns the stored key. */
export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const { userId, response } = await requireUser(ctx)
  if (!userId) return response ?? jsonError('unauthorized', 401)
  try {
    return Response.json({ ...(await status(ctx.env, userId)), default_voice_id: DEFAULT_VOICE_ID })
  } catch {
    return jsonError('could not read voice settings', 500)
  }
}

/**
 * Save the provider key. It is validated against the provider first, then
 * encrypted server-side and stored as ciphertext. The response is status only.
 */
export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const { userId, response } = await requireUser(ctx)
  if (!userId) return response ?? jsonError('unauthorized', 401)

  let body: { apiKey?: unknown; voiceId?: unknown; voiceName?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return jsonError('expected a JSON object body')
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const voiceId =
    typeof body.voiceId === 'string' && body.voiceId.trim() ? body.voiceId.trim() : DEFAULT_VOICE_ID
  if (!apiKey) return jsonError('apiKey is required')
  if (apiKey.length > MAX_KEY_LENGTH) return jsonError('apiKey looks too long')
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(voiceId)) return jsonError('invalid voiceId')

  const check = await validateVoice(apiKey, voiceId)
  if (!check.ok) {
    const hint = check.error.status === 401 ? 'the provider rejected this key' : check.error.message
    return jsonError(`could not verify: ${hint}`, 400)
  }

  try {
    const name =
      typeof body.voiceName === 'string' && body.voiceName.trim() ? body.voiceName.trim() : check.name
    return Response.json(
      await saveSettings(ctx.env, userId, {
        apiKey,
        voiceId,
        voiceName: name,
        category: check.category,
        tier: check.tier,
        warning: check.warning,
      }),
    )
  } catch {
    return jsonError('could not save settings', 500)
  }
}

/**
 * PUT — two jobs:
 *   {} → free connection test with the stored key (no credits)
 *   { voice_id } → switch to another voice using the stored key (validated, no credits)
 */
export async function onRequestPut(ctx: Ctx): Promise<Response> {
  const { userId, response } = await requireUser(ctx)
  if (!userId) return response ?? jsonError('unauthorized', 401)

  let body: { voice_id?: unknown } = {}
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    /* empty body is a plain test */
  }

  if (typeof body.voice_id === 'string' && body.voice_id.trim()) {
    const voiceId = body.voice_id.trim()
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(voiceId)) return jsonError('invalid voice_id')
    const result = await changeVoice(ctx.env, userId, voiceId)
    if (!result.ok) return jsonError(result.error, 400)
    return Response.json({ ...result.status, switched: voiceId })
  }

  const row = await readSettings(ctx.env, userId)
  if (!row) return jsonError('voice is not configured yet', 404)
  const { decryptKey, validateVoice: validate } = await import('../../_lib/voice')
  try {
    const apiKey = await decryptKey(ctx.env, userId, row.key_cipher)
    const check = await validate(apiKey, row.voice_id)
    if (!check.ok) return jsonError('provider rejected the stored key; save it again', 400)
    return Response.json({
      ok: true,
      voice_id: row.voice_id,
      voice_name: check.name ?? row.voice_name,
      voice_category: check.category,
      plan_tier: check.tier,
      warning: check.warning,
    })
  } catch {
    return jsonError('could not read the stored key; save it again', 500)
  }
}

export async function onRequestDelete(ctx: Ctx): Promise<Response> {
  const { userId, response } = await requireUser(ctx)
  if (!userId) return response ?? jsonError('unauthorized', 401)
  try {
    await deleteSettings(ctx.env, userId)
    return Response.json(await status(ctx.env, userId))
  } catch {
    return jsonError('could not remove the key', 500)
  }
}
