import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/env'
import { useAuth } from '../features/auth/context'
import { Button, ConfigNotice, ErrorBox, Field, Input, SparkleLogo } from '../components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <main className="pg-shell">
      <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="flex flex-col items-center gap-3">
          <SparkleLogo size={64} />
          <span className="pg-title text-3xl text-ink">PostGen</span>
        </Link>
        <p className="mt-1 text-sm font-bold text-ink-soft">Your private X post studio</p>

        <div className="pg-glass mt-8 w-full rounded-[28px] p-6">
          <form onSubmit={submit} className="space-y-4">
            {error ? <ErrorBox message={error} /> : null}

            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-ink-soft">
          Invite only — ask the admin for access.
          <br />
          No public sign-up.
        </p>
      </div>
    </main>
  )
}
