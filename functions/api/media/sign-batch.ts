import { getUserFromRequest, serviceClient } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'
import { keyBelongsToUser, signAsset } from '../../_lib/signing'

const DEFAULT_TTL = 300 // 5 minutes
const MAX_KEYS = 100

/**
 * POST /api/media/sign-batch  { "keys": ["<r2_key>", …], "ttl"?: 300 }
 * Signs many asset URLs in ONE request — grids and libraries used to fire
 * one /sign request per image. Returns { urls: { [key]: "/api/media/…" } }.
 * Keys the caller may not view are silently omitted.
 */
export async function onRequestPost(
  context: { request: Request; env: Env },
): Promise<Response> {
  const { request, env } = context

  const user = await getUserFromRequest(request, env)
  if (!user) return jsonError('unauthorized', 401)

  let keys: string[] = []
  let ttl = DEFAULT_TTL
  try {
    const body = (await request.json()) as { keys?: unknown; ttl?: unknown }
    if (Array.isArray(body.keys)) keys = body.keys.filter((k): k is string => typeof k === 'string' && k.length > 0)
    if (typeof body.ttl === 'number' && body.ttl > 0) ttl = Math.min(body.ttl, 3600)
  } catch {
    return jsonError('expected JSON body')
  }
  keys = [...new Set(keys)].slice(0, MAX_KEYS)
  if (keys.length === 0) return Response.json({ urls: {} })

  // Ownership: keys under the caller's own prefix are fine; anything else
  // needs an assets row owned by the caller (accepted shares).
  const foreign = keys.filter((k) => !keyBelongsToUser(k, user.id))
  let allowedForeign = new Set<string>()
  if (foreign.length > 0) {
    const db = serviceClient(env)
    const { data } = await db.from('assets').select('r2_key').eq('user_id', user.id).in('r2_key', foreign)
    allowedForeign = new Set(((data ?? []) as Array<{ r2_key: string }>).map((r) => r.r2_key))
  }
  const allowed = keys.filter((k) => keyBelongsToUser(k, user.id) || allowedForeign.has(k))

  const exp = Math.floor(Date.now() / 1000) + ttl
  const urls: Record<string, string> = {}
  try {
    for (const key of allowed) {
      const sig = await signAsset(key, exp, env)
      urls[key] = `/api/media/${key}?exp=${exp}&sig=${sig}`
    }
  } catch {
    return jsonError('media signing not configured (set MEDIA_URL_SECRET)', 500)
  }
  return Response.json({ urls, exp })
}
