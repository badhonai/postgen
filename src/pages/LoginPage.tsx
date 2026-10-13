import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/env'
import { Button, Card, ConfigNotice, ErrorBox, Field, Input } from '../components/ui'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isSupabaseConfigured) return <ConfigNotice />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase!.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate(from, { replace: true })
      } else {
        const { data, error } = await supabase!.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) {
          navigate(from, { replace: true })
        } else {
          setNotice('Account created — check your inbox to confirm your email, then sign in.')
          setMode('signin')
        }
      }
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
        <h1 className="mt-2 text-2xl font-bold">
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === 'signin'
            ? 'Your projects and posts — private to you.'
            : 'One account per person. Your data is isolated with Row Level Security.'}
        </p>
      </header>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          {error ? <ErrorBox message={error} /> : null}
          {notice ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              {notice}
            </div>
          ) : null}

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
          <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
            <Input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-zinc-500">
        {mode === 'signin' ? (
          <>
            No account yet?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className="text-emerald-400 hover:underline"
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError(null)
              }}
              className="text-emerald-400 hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </main>
  )
}
