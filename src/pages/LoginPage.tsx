import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/env'
import { useAuth } from '../features/auth/context'
import { Button, ConfigNotice, ErrorBox, SparkleLogo } from '../components/ui'

function BgStars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white" className="absolute top-[9%] left-[22%] opacity-70">
        <path d="M12 2c.6 3.2 1.6 5.3 3 6.7 1.4 1.4 3.5 2.4 6.7 3-3.2.6-5.3 1.6-6.7 3-1.4 1.4-2.4 3.5-3 6.7-.6-3.2-1.6-5.3-3-6.7-1.4-1.4-3.5-2.4-6.7-3 3.2-.6 5.3-1.6 6.7-3 1.4-1.4 2.4-3.5 3-6.7z" />
      </svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="absolute top-[22%] right-[14%] opacity-60">
        <path d="M12 2c.6 3.2 1.6 5.3 3 6.7 1.4 1.4 3.5 2.4 6.7 3-3.2.6-5.3 1.6-6.7 3-1.4 1.4-2.4 3.5-3 6.7-.6-3.2-1.6-5.3-3-6.7-1.4-1.4-3.5-2.4-6.7-3 3.2-.6 5.3-1.6 6.7-3 1.4-1.4 2.4-3.5 3-6.7z" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="absolute bottom-[16%] left-[12%] opacity-55">
        <path d="M12 2c.6 3.2 1.6 5.3 3 6.7 1.4 1.4 3.5 2.4 6.7 3-3.2.6-5.3 1.6-6.7 3-1.4 1.4-2.4 3.5-3 6.7-.6-3.2-1.6-5.3-3-6.7-1.4-1.4-3.5-2.4-6.7-3 3.2-.6 5.3-1.6 6.7-3 1.4-1.4 2.4-3.5 3-6.7z" />
      </svg>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="absolute right-[10%] bottom-[28%] opacity-60">
        <path d="M12 2c.6 3.2 1.6 5.3 3 6.7 1.4 1.4 3.5 2.4 6.7 3-3.2.6-5.3 1.6-6.7 3-1.4 1.4-2.4 3.5-3 6.7-.6-3.2-1.6-5.3-3-6.7-1.4-1.4-3.5-2.4-6.7-3 3.2-.6 5.3-1.6 6.7-3 1.4-1.4 2.4-3.5 3-6.7z" />
      </svg>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isSupabaseConfigured) return <ConfigNotice />
  if (session) {
    navigate(from, { replace: true })
    return null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { error } = await supabase!.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="pg-shell relative">
      <BgStars />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-[440px] flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="flex flex-col items-center gap-3">
          <SparkleLogo size={132} gradient />
          <span className="pg-title mt-1 text-5xl text-ink">PostGen</span>
        </Link>
        <p className="mt-1 text-base font-bold text-ink-soft">Your private X post studio</p>

        <div className="pg-glass mt-8 w-full rounded-[28px] p-5">
          <form onSubmit={submit} className="space-y-3">
            {error ? <ErrorBox message={error} /> : null}

            <label className="flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/55 px-3.5 py-3 shadow-[0_6px_18px_rgba(70,60,130,0.08)] focus-within:border-white focus-within:ring-2 focus-within:ring-ink/15">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-soft">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M2.5 6.5L12 13l9.5-6.5" />
              </svg>
              <input
                type="email"
                required
                autoComplete="email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-soft/70 focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/55 px-3.5 py-3 shadow-[0_6px_18px_rgba(70,60,130,0.08)] focus-within:border-white focus-within:ring-2 focus-within:ring-ink/15">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-soft">
                <rect x="4" y="11" width="16" height="10" rx="2.5" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <input
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-soft/70 focus:outline-none"
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((s) => !s)}
                className="shrink-0 text-ink-soft transition hover:text-ink"
              >
                {showPw ? (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M9.9 9.9a3 3 0 1 0 4.2 4.2" />
                    <path d="M2 2l20 20" />
                  </svg>
                ) : (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </label>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 flex items-start justify-center gap-1.5 text-center text-xs font-semibold text-ink-soft">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 shrink-0">
            <rect x="4" y="11" width="16" height="10" rx="2.5" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>
            Invite only — ask the admin for access.
            <span className="mt-0.5 block text-ink-soft/70">No public sign-up.</span>
          </span>
        </p>
      </div>
    </main>
  )
}
