import { getUserFromRequest, serviceClient } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import { keyBelongsToUser } from '../../_lib/signing'

/**
 * POST /api/media/delete  { "key": "<r2_key>" }
 * Removes the R2 object and its assets row (owner only).
 */
export async function onRequestPost(
  context: { request: Request; env: Env },
): Promise<Response> {
  const { request, env } = context

  const user = await getUserFromRequest(request, env)
  if (!user) return jsonError('unauthorized', 401)

  let key: string
  try {
    const body = (await request.json()) as { key?: string }
    key = body.key ?? ''
  } catch {
    return jsonError('expected JSON body')
  }
  if (!key) return jsonError('missing key')
  if (!keyBelongsToUser(key, user.id)) return jsonError('forbidden', 403)

  const db = serviceClient(env)

  // Only delete if the asset row exists and belongs to the caller.
  const { data: asset } = await db
    .from('assets')
    .select('id')
    .eq('r2_key', key)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!asset) return jsonError('asset not found', 404)

  await env.MEDIA.delete(key).catch(() => undefined)
  const { error } = await db.from('assets').delete().eq('id', asset.id)
  if (error) return jsonError(error.message, 500)

  return Response.json({ ok: true })
}
