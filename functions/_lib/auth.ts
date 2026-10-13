import { createClient } from '@supabase/supabase-js'
import type { Env } from './env'

export type AuthedUser = { id: string; token: string }

/** Service-role client — bypasses RLS; server-side only. */
export function serviceClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Verify the caller's Supabase access token (any signing-key type:
 * ES256 via JWKS or legacy HS256 — Auth server validates them all).
 * Returns null when missing/invalid.
 */
export async function getUserFromRequest(
  request: Request,
  env: Env,
): Promise<AuthedUser | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null

  try {
    const supabase = serviceClient(env)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return { id: data.user.id, token }
  } catch {
    return null
  }
}
