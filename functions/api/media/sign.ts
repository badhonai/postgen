import { getUserFromRequest } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import { keyBelongsToUser, signAsset } from '../../_lib/signing'

const DEFAULT_TTL = 300 // 5 minutes
const MAX_TTL = 3600

/**
 * GET /api/media/sign?key=<r2_key>&ttl=300
 * Returns a short-lived signed URL for an asset the caller owns.
 */
export async function onRequestGet(
  context: { request: Request; env: Env },
): Promise<Response> {
  const { request, env } = context

  const user = await getUserFromRequest(request, env)
  if (!user) return jsonError('unauthorized', 401)

  const url = new URL(request.url)
  const key = url.searchParams.get('key') ?? ''
  if (!key) return jsonError('missing key')
  if (!keyBelongsToUser(key, user.id)) return jsonError('forbidden', 403)

  const ttl = Math.min(Number(url.searchParams.get('ttl')) || DEFAULT_TTL, MAX_TTL)
  const exp = Math.floor(Date.now() / 1000) + ttl
  let sig: string
  try {
    sig = await signAsset(key, exp, env)
  } catch {
    return jsonError('media signing not configured (set MEDIA_URL_SECRET)', 500)
  }

  return Response.json({
    url: `/api/media/${key}?exp=${exp}&sig=${sig}`,
    exp,
  })
}
