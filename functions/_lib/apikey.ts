import { serviceClient } from './auth'
import { jsonError, type Env } from './env'

const encoder = new TextEncoder()

export type ApiKeyAuth = { keyId: string; userId: string }

/** SHA-256 hex of the full API key — matches the client-side hashing. */
export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(key))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ── per-minute rate limiting (in-memory, per isolate — soft limit) ──
const RATE_LIMIT_PER_MIN = 250
const buckets = new Map<string, { start: number; count: number }>()

function rateAllow(keyId: string): boolean {
  const now = Date.now()
  const b = buckets.get(keyId)
  if (!b || now - b.start >= 60_000) {
    buckets.set(keyId, { start: now, count: 1 })
    return true
  }
  b.count += 1
  return b.count <= RATE_LIMIT_PER_MIN
}

export type RequireApiKeyResult = { ok: true; auth: ApiKeyAuth } | { ok: false; response: Response }

/**
 * `Authorization: Bearer pgk_live_<prefix>_<secret>` → key owner, or a ready-made error.
 * Also enforces the 250/min/key rate limit and refreshes last_used_at.
 */
export async function requireApiKey(request: Request, env: Env): Promise<RequireApiKeyResult> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, response: jsonError('server not configured', 500) }
  }

  const header = request.headers.get('authorization') ?? ''
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!key || !key.startsWith('pgk_')) {
    return { ok: false, response: jsonError('missing API key (Authorization: Bearer pgk_live_…)', 401) }
  }

  const hash = await hashApiKey(key)
  const db = serviceClient(env)
  const { data, error } = await db
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle()
  if (error) return { ok: false, response: jsonError('auth lookup failed', 500) }
  if (!data || data.revoked_at) {
    return { ok: false, response: jsonError('invalid API key', 401) }
  }

  if (!rateAllow(data.id)) {
    return {
      ok: false,
      response: jsonError('rate limit exceeded (250 requests/min per key)', 429),
    }
  }

  void db
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined)

  return { ok: true, auth: { keyId: data.id, userId: data.user_id } }
}
