import { mediaUrlSecret, type Env } from './env'

const encoder = new TextEncoder()

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Short-lived signature over `${key}.${exp}` (exp = unix seconds). */
export async function signAsset(key: string, exp: number, env: Env): Promise<string> {
  return hmacHex(`${key}.${exp}`, mediaUrlSecret(env))
}

export async function verifyAsset(
  key: string,
  exp: number,
  sig: string,
  env: Env,
): Promise<boolean> {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false
  const expected = await signAsset(key, exp, env)
  if (expected.length !== sig.length) return false
  // constant-time-ish compare
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  return diff === 0
}

/**
 * R2 key layouts:
 *   users/{userId}/projects/{projectId}/{stamp}-{rand}.{ext}   post media
 *   studio/{userId}/{jobId}/{path}                              studio job files
 * Both are namespaced by owner, so the prefix alone proves who signed the URL.
 */
export function keyBelongsToUser(key: string, userId: string): boolean {
  return key.startsWith(`users/${userId}/`) || key.startsWith(`studio/${userId}/`)
}
