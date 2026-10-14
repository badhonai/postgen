import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

/**
 * Supabase client (auth + Postgres with RLS).
 * Returns null until env vars are set so the app degrades gracefully.
 */
/**
 * localStorage, or a memory stand-in when the browser blocks it (private mode,
 * sandboxed frames). Without this the whole auth client can throw on first
 * touch and the session never persists.
 */
function safeStorage(): Storage {
  try {
    const probe = '__pg_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      get length() {
        return mem.size
      },
      clear: () => mem.clear(),
      getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
      key: (i: number) => [...mem.keys()][i] ?? null,
      removeItem: (k: string) => void mem.delete(k),
      setItem: (k: string, v: string) => void mem.set(k, v),
    } as Storage
  }
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: safeStorage(),
      },
    })
  : null
