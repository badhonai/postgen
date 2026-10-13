import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/env'
import { useAuth } from '../features/auth/context'
import { Button, Card, ConfigNotice, ErrorBox, Field, Input } from '../components/ui'

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <header>
        <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← PostGen
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Your projects and posts — private to you.
        </p>
      </header>

      <Card>
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
      </Card>

      <p className="text-center text-xs text-zinc-500">
        Access is invite-only — accounts are created by the admin.
        <br />
        No public sign-up.
      </p>
    </main>
  )
}
