import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { forgetAccount, rememberAccount } from '../../lib/accounts'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(() => !!supabase)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      rememberAccount(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      rememberAccount(next)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    // A signed-out account's refresh token is revoked — keeping it in
    // the switcher would offer a switch that can only fail.
    if (session?.user) forgetAccount(session.user.id)
    await supabase?.auth.signOut()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
