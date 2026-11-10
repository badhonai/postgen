import { getUserFromRequest } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import {
  deleteSettings,
  readSettings,
  saveSettings,
  status,
  validateVoice,
} from '../../_lib/voice'

type Ctx = { request: Request; env: Env }

const DEFAULT_VOICE_ID = 'dmWfLQZJq7wNPv9WmtiM'
const MAX_KEY_LENGTH = 200

async function requireUser(ctx: Ctx) {
  const user = await getUserFromRequest(ctx.request, ctx.env)
  if (!user) return { user: null, response: jsonError('unauthorized', 401) }
  return { user, response: null }
}

/** Status only — never returns the stored key. */
export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const { user, response } = await requireUser(ctx)
  if (!user) return response
  try {
    return Response.json(await status(ctx.env, user.id))
  } catch {
    return jsonError('could not read voice settings', 500)
  }
}

/**
 * Save the provider key. It is validated against the provider first, then
 * encrypted server-side and stored as ciphertext. The response is status only.
 */
export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const { user, response } = await requireUser(ctx)
  if (!user) return response

  let body: { apiKey?: unknown; voiceId?: unknown; voiceName?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return jsonError('expected a JSON object body')
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const voiceId = typeof body.voiceId === 'string' && body.voiceId.trim() ? body.voiceId.trim() : DEFAULT_VOICE_ID
  if (!apiKey) return jsonError('apiKey is required')
  if (apiKey.length > MAX_KEY_LENGTH) return jsonError('apiKey looks too long')
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(voiceId)) return jsonError('invalid voiceId')

  const check = await validateVoice(apiKey, voiceId)
  if (!check.ok) {
    const hint = check.error.status === 401 ? 'the provider rejected this key' : check.error.message
    return jsonError(`could not verify: ${hint}`, 400)
  }

  try {
    const name = typeof body.voiceName === 'string' && body.voiceName.trim() ? body.voiceName.trim() : check.name
    return Response.json(await saveSettings(ctx.env, user.id, { apiKey, voiceId, voiceName: name }))
  } catch {
    return jsonError('could not save settings', 500)
  }
}

export async function onRequestDelete(ctx: Ctx): Promise<Response> {
  const { user, response } = await requireUser(ctx)
  if (!user) return response
  try {
    await deleteSettings(ctx.env, user.id)
    return Response.json(await status(ctx.env, user.id))
  } catch {
    return jsonError('could not remove the key', 500)
  }
}

/** Free connection test: reads voice metadata, does not synthesize (no charge). */
export async function onRequestPut(ctx: Ctx): Promise<Response> {
  const { user, response } = await requireUser(ctx)
  if (!user) return response
  const row = await readSettings(ctx.env, user.id)
  if (!row) return jsonError('voice is not configured yet', 404)

  const { decryptKey, validateVoice: validate } = await import('../../_lib/voice')
  try {
    const apiKey = await decryptKey(ctx.env, user.id, row.key_cipher)
    const check = await validate(apiKey, row.voice_id)
    if (!check.ok) return jsonError('provider rejected the stored key; save it again', 400)
    return Response.json({ ok: true, voice_id: row.voice_id, voice_name: check.name ?? row.voice_name })
  } catch {
    return jsonError('could not read the stored key; save it again', 500)
  }
}
