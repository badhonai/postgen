import { createClient, type Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

/**
 * Multi-account switching (Settings → Accounts).
 *
 * Supabase holds ONE live session, so we keep each added account's
 * refresh token in localStorage and swap sessions with setSession —
 * the user jumps between accounts without re-typing passwords.
 * Tokens stay on this device only.
 */
export type StoredAccount = {
  id: string
  email: string
  accessToken: string
  refreshToken: string
}

const STORE_KEY = 'postgen.accounts.v1'

export function loadAccounts(): StoredAccount[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredAccount[]
    return Array.isArray(parsed) ? parsed.filter((a) => a?.id && a?.refreshToken) : []
  } catch {
    return []
  }
}

function saveAccounts(list: StoredAccount[]): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list))
  } catch {
    /* private mode — switching just won't persist */
  }
}

/** Upsert the account behind a live session (keeps its tokens fresh). */
export function rememberAccount(session: Session | null): void {
  if (!session?.user?.email || !session.refresh_token) return
  const list = loadAccounts()
  const entry: StoredAccount = {
    id: session.user.id,
    email: session.user.email,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  }
  const next = [entry, ...list.filter((a) => a.id !== entry.id)]
  saveAccounts(next.slice(0, 8))
}

export function forgetAccount(id: string): void {
  saveAccounts(loadAccounts().filter((a) => a.id !== id))
}

/** Make `account` the live session, then reload into its dashboard. */
export async function switchAccount(account: StoredAccount): Promise<void> {
  if (!supabase) throw new Error('Sign-in is not configured')
  const { data, error } = await supabase.auth.setSession({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  })
  if (error || !data.session) {
    // Refresh token revoked/expired — drop the dead entry.
    forgetAccount(account.id)
    throw new Error('That saved session expired. Add the account again to switch to it.')
  }
  rememberAccount(data.session)
  window.location.assign('/dashboard')
}

/**
 * Sign a NEW account in (without disturbing the current session) and
 * remember it for switching. Returns the added account's email.
 */
export async function addAccount(email: string, password: string): Promise<string> {
  // Throwaway, non-persisted client: signing in here must NOT replace
  // the live session. Never signOut on it (that would revoke the fresh
  // refresh token we are about to store) — just let it be collected.
  const temp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await temp.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  if (!data.session?.user?.email) throw new Error('Could not sign that account in')
  rememberAccount(data.session)
  return data.session.user.email
}
