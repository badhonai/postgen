import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { Button } from '../components/ui'

const features = [
  {
    title: 'Posts & threads',
    body: 'Store promotional & educational posts per project, with an X-accurate character counter and one-click copy.',
  },
  {
    title: 'No repeat posts',
    body: 'Exact-hash + similarity detection blocks duplicates before they ever reach your timeline.',
  },
  {
    title: 'AI agents connect in',
    body: 'Claude Desktop, Gemini CLI, or local models draft & update posts via REST/MCP — drafts only, you approve.',
  },
  {
    title: 'Knowledge per project',
    body: 'Each project keeps its own knowledge, sources, and media — the raw material for great posts.',
  },
]

export default function HomePage() {
  const { session } = useAuth()

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-16">
      <header>
        <p className="text-sm font-medium tracking-widest text-emerald-400 uppercase">
          Twitter/X post studio
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          PostGen
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Store, organize, and generate posts for your web3 projects — every project
          with its own knowledge, sources, and assets. Built on free tiers only, $0 forever.
        </p>
        <div className="mt-8 flex gap-3">
          {session ? (
            <Link to="/dashboard">
              <Button>Open dashboard →</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button>Sign in →</Button>
            </Link>
          )}
          <a href="https://github.com/badhonai/postgen" target="_blank" rel="noreferrer">
            <Button variant="ghost">GitHub</Button>
          </a>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="font-semibold text-zinc-100">{f.title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto border-t border-zinc-800 pt-6 text-xs text-zinc-500">
        React + Vite · Cloudflare Pages &amp; R2 · Supabase · free external AI tools.
        Roadmap in <code className="text-zinc-400">PLAN.md</code>.
      </footer>
    </main>
  )
}
