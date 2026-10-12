/**
 * Client-side environment access. Only VITE_-prefixed vars are visible here —
 * server secrets (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, R2 creds)
 * live exclusively in Cloudflare Pages Functions env.
 */
const env = import.meta.env

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
