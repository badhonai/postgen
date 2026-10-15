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
    try {
      allowed = await verifyAsset(key, exp, sig, env)
    } catch {
      return jsonError('media signing not configured (set MEDIA_URL_SECRET)', 500)
    }
  }
  if (!allowed) {
    const user = await getUserFromRequest(request, env)
    allowed = !!user && keyBelongsToUser(key, user.id)
  }
  if (!allowed) return jsonError('forbidden', 403)

  const object = await env.MEDIA.get(key)
  if (!object) return jsonError('not found', 404)

  // Signed URLs are immutable (uploads always mint fresh random keys, so
  // the object behind a key never changes) — let browsers cache hard and
  // revalidate cheaply with a weak ETag from key + size.
  const etag = `W/"${object.size}-${key.length}-${key.slice(-8)}"`
  const headers = new Headers({
    'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'cache-control': 'private, max-age=300, immutable',
    etag,
  })
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers })
  }
  headers.set('content-length', String(object.size))
  return new Response(object.body, { headers })
}
