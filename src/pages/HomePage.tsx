import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { Button, SparkleLogo } from '../components/ui'

const features = [
  {
    title: 'No repeat posts',
    body: 'Exact-hash + similarity detection blocks duplicates before they ever reach your timeline.',
    tile: 'bg-mint',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Bring your own AI',
    body: 'Claude Desktop, Gemini CLI, or local models draft & update posts via REST/MCP — drafts only, you approve.',
    tile: 'bg-lilac',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="8" width="14" height="11" rx="4" />
        <path d="M12 8V4M9 14h.01M15 14h.01M2 12v3M22 12v3" />
      </svg>
    ),
  },
  {
    title: 'Private media',
    body: 'Logos, mascots and product shots live in private R2 storage with signed URLs — yours only.',
    tile: 'bg-cream',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="4" />
        <circle cx="9" cy="11" r="2" />
        <path d="M21 16l-5-5-8 8" />
      </svg>
    ),
  },
  {
    title: 'Posts & threads',
    body: 'Store posts per project with an X-accurate counter, thread builder and one-click copy.',
    tile: 'bg-peach',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.4-.7L3 21l1.8-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
      </svg>
    ),
  },
]

export default function HomePage() {
  const { session } = useAuth()

  return (
    <main className="pg-shell">
      <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col px-6 py-10">
        {/* ── top bar ── */}
        <header className="flex items-center gap-2.5">
          <SparkleLogo size={34} />
          <span className="pg-title text-xl text-ink">PostGen</span>
        </header>

        {/* ── hero ── */}
        <section className="mt-10">
          <h1 className="pg-title text-[2.9rem] leading-[1.05] text-ink">
            Write.{' '}
            <span className="underline decoration-butter decoration-[7px] underline-offset-[10px]">
              Review.
            </span>
            <br />
            Post.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed font-semibold text-ink-soft">
            Store, organize, and generate X posts for your web3 projects — every project with
            its own brand profile, knowledge and assets. Built on free tiers only, $0 forever.
          </p>
          <div className="mt-7 flex gap-3">
            <Link to={session ? '/dashboard' : '/login'} className="flex-1">
              <Button className="w-full">{session ? 'Open dashboard →' : 'Sign in'}</Button>
            </Link>
            <a href="#features">
              <Button variant="ghost">Learn more</Button>
            </a>
          </div>
        </section>

        {/* ── feature tiles ── */}
        <section id="features" className="mt-10 grid grid-cols-2 gap-3.5">
          {features.map((f) => (
            <div key={f.title} className={`pg-tile ${f.tile} p-5`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/55 text-ink">
                {f.icon}
              </div>
              <h3 className="pg-title mt-3 text-[15px] text-ink">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed font-semibold text-ink-soft">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-auto pt-10 text-[11px] font-semibold text-ink-soft">
          React + Vite · Cloudflare Pages &amp; R2 · Supabase · free external AI tools. ·{' '}
          <a
            href="https://github.com/badhonai/postgen"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            GitHub
          </a>
        </footer>
      </div>
    </main>
  )
}
