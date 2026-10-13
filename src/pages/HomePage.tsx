import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { Button } from '../components/ui'

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
        <header className="flex items-center justify-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-sky/80 to-lilac/90 shadow-[0_10px_24px_rgba(70,60,130,0.18)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#f6c96b">
              <path d="M12 1.6c.7 3.9 1.9 6.4 3.6 8.1 1.7 1.7 4.2 2.9 8.1 3.6-3.9.7-6.4 1.9-8.1 3.6-1.7 1.7-2.9 4.2-3.6 8.1-.7-3.9-1.9-6.4-3.6-8.1-1.7-1.7-4.2-2.9-8.1-3.6 3.9-.7 6.4-1.9 8.1-3.6 1.7-1.7 2.9-4.2 3.6-8.1z" />
            </svg>
          </span>
          <span className="pg-title text-2xl text-ink">PostGen</span>
        </header>

        {/* ── hero ── */}
        <section className="mt-10 text-center">
          <h1 className="pg-title text-[3.15rem] leading-[1.04] text-ink">
            Write.
            <br />
            <span className="relative inline-block">
              Review.
              <svg
                viewBox="0 0 200 14"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden
                className="absolute -bottom-1.5 left-0 w-full"
              >
                <path
                  d="M4 10 C 55 1.5, 145 1.5, 196 8"
                  stroke="#f2c14e"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <br />
            Post.
          </h1>
          <p className="mx-auto mt-6 max-w-[300px] text-[17px] leading-relaxed font-bold text-ink-soft">
            Draft engaging X posts with AI. Humans approve. You grow.
          </p>
          <div className="mt-8 space-y-3">
            <Link to={session ? '/dashboard' : '/login'}>
              <Button className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-base">
                {session ? 'Open dashboard' : 'Sign in'}
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Button>
            </Link>
            <a
              href="#features"
              className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-white/70 bg-white/45 px-6 py-2.5 text-sm font-bold text-ink transition hover:bg-white/70"
            >
              Learn more
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </a>
          </div>
        </section>

        {/* ── feature tiles ── */}
        <section id="features" className="mt-10 space-y-3">
          {features.map((f) => (
            <div key={f.title} className={`pg-tile ${f.tile} flex items-center gap-4 p-4`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/55 text-ink">
                {f.icon}
              </div>
              <div className="min-w-0">
                <h3 className="pg-title text-[15px] text-ink">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed font-semibold text-ink-soft">{f.body}</p>
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-auto pt-10 text-center text-[11px] font-semibold text-ink-soft">
          React + Vite · Cloudflare Pages &amp; R2 · Supabase · MIT ·{' '}
          <strong className="text-ink">$0 forever</strong>
          <br />
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
