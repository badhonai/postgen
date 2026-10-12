import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured } from '../lib/env'

type Health = { ok: boolean; service: string; milestone: string; time: string }

const deliverables = [
  { label: 'React + Vite + TypeScript + Tailwind', done: true },
  { label: 'Cloudflare Pages config (wrangler.toml + R2 binding)', done: true },
  { label: 'Database schema — 11 tables with per-user RLS', done: true },
  { label: 'No-repeat engine — content_hash + pg_trgm similarity', done: true },
  { label: 'Supabase keep-alive workflow (free tier stays awake)', done: true },
  { label: 'Auth & projects (M1)', done: false },
  { label: 'Posts, threads & search (M2)', done: false },
  { label: 'R2 media (M3) · Agent API + MCP (M4)', done: false },
]

export default function HomePage() {
  const health = useQuery<Health>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error('unreachable')
      return res.json()
    },
    retry: false,
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <header>
        <p className="text-sm font-medium tracking-widest text-emerald-400 uppercase">
          M0 · Foundation
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">PostGen</h1>
        <p className="mt-3 text-zinc-400">
          Twitter/X post studio for web3 projects — store posts, feed project
          knowledge, and let free AI tools (Claude Desktop, Gemini CLI, local
          models) draft via REST&nbsp;/&nbsp;MCP. Everything free tier, $0.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          Build status
        </h2>
        <ul className="mt-4 space-y-2.5">
          {deliverables.map((d) => (
            <li key={d.label} className="flex items-start gap-3 text-sm">
              <span
                className={
                  d.done
                    ? 'mt-0.5 text-emerald-400'
                    : 'mt-0.5 text-zinc-600'
                }
                aria-hidden
              >
                {d.done ? '✓' : '○'}
              </span>
              <span className={d.done ? 'text-zinc-200' : 'text-zinc-500'}>
                {d.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Pages Functions
          </h3>
          <p className="mt-2 text-sm">
            {health.isPending ? (
              <span className="text-zinc-500">checking /api/health…</span>
            ) : health.data?.ok ? (
              <span className="text-emerald-400">● online</span>
            ) : (
              <span className="text-amber-400">
                ○ not running (start with <code>npm run pages:dev</code>)
              </span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Supabase env
          </h3>
          <p className="mt-2 text-sm">
            {isSupabaseConfigured ? (
              <span className="text-emerald-400">● configured</span>
            ) : (
              <span className="text-amber-400">
                ○ pending (copy .env.example → .env)
              </span>
            )}
          </p>
        </div>
      </section>

      <footer className="mt-auto border-t border-zinc-800 pt-6 text-xs text-zinc-500">
        Next up: <span className="text-zinc-300">M1 — Auth &amp; projects</span>.
        See <code className="text-zinc-400">PLAN.md</code> for the full roadmap
        and <code className="text-zinc-400">README.md</code> for deploy steps.
      </footer>
    </main>
  )
}
