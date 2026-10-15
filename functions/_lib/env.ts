/**
 * Shared types & helpers for Pages Functions (server-side only).
 * Bindings & secrets arrive via context.env (see wrangler.toml + Pages settings).
 */

export type Env = {
  MEDIA: {
    put: (
      key: string,
      value: ArrayBuffer | ReadableStream | string,
      options?: { httpMetadata?: { contentType?: string } },
    ) => Promise<unknown>
    get: (
      key: string,
    ) => Promise<{
      arrayBuffer: () => Promise<ArrayBuffer>
      body: ReadableStream
      httpMetadata?: { contentType?: string }
      size: number
    } | null>
    delete: (key: string) => Promise<void>
  }
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  /** Optional dedicated HMAC secret for signed media URLs. */
  MEDIA_URL_SECRET?: string
  /** Legacy HS256 secret — used as HMAC fallback if MEDIA_URL_SECRET unset. */
  SUPABASE_JWT_SECRET?: string
  /**
   * Optional Sorsa API key (free tier) for the Profile Sorsa Score card.
   * Server-side only — set in Cloudflare Pages secrets, never VITE_-prefixed.
   */
  SORSA_API_KEY?: string
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status })
}

/**
 * HMAC secret for media URLs: dedicated var first, then the legacy JWT secret,
 * then the service key (all server-side only; works with zero extra config).
 */
export function mediaUrlSecret(env: Env): string {
  const secret = env.MEDIA_URL_SECRET || env.SUPABASE_JWT_SECRET || env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Set MEDIA_URL_SECRET (or SUPABASE_JWT_SECRET) in Pages secrets')
  }
  return secret
}
