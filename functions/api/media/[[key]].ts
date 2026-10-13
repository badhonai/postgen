import { getUserFromRequest } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import { keyBelongsToUser, verifyAsset } from '../../_lib/signing'

/**
 * GET /api/media/<r2_key…>?exp=&sig=
 * Streams a private R2 object. Access = valid short-lived signature,
 * OR a valid user JWT whose user owns the key.
 */
export async function onRequestGet(
  context: { request: Request; env: Env; params: { key?: string | string[] } },
): Promise<Response> {
  const { request, env, params } = context

  const raw = params.key
  const key = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
  if (!key) return jsonError('missing key', 404)

  const url = new URL(request.url)
  const exp = Number(url.searchParams.get('exp') ?? '')
  const sig = url.searchParams.get('sig') ?? ''

  let allowed = false
  if (sig && exp) {
    allowed = await verifyAsset(key, exp, sig, env)
  }
  if (!allowed) {
    const user = await getUserFromRequest(request, env)
    allowed = !!user && keyBelongsToUser(key, user.id)
  }
  if (!allowed) return jsonError('forbidden', 403)

  const object = await env.MEDIA.get(key)
  if (!object) return jsonError('not found', 404)

  const headers = new Headers({
    'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'content-length': String(object.size),
    'cache-control': 'private, max-age=300',
  })
  return new Response(object.body, { headers })
}
