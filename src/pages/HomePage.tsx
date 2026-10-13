import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'

function TileIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/55 text-ink">
      {children}
    </div>
  )
}

const ICON = {
  width: 21,
  height: 21,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export default function HomePage() {
  const { session } = useAuth()

  return (
    <main className="pg-shell">
      <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col px-5 py-9">
        {/* ── top pill ── */}
        <header className="flex justify-center">
          <span className="pg-glass inline-flex items-center gap-2 rounded-full px-4 py-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-ink">
              <path d="M12 1.6c.7 3.9 1.9 6.4 3.6 8.1 1.7 1.7 4.2 2.9 8.1 3.6-3.9.7-6.4 1.9-8.1 3.6-1.7 1.7-2.9 4.2-3.6 8.1-.7-3.9-1.9-6.4-3.6-8.1-1.7-1.7-4.2-2.9-8.1-3.6 3.9-.7 6.4-1.9 8.1-3.6 1.7-1.7 2.9-4.2 3.6-8.1z" />
            </svg>
            <span className="pg-title text-[15px] text-ink">PostGen</span>
          </span>
        </header>

        {/* ── hero ── */}
        <section className="mt-8 text-center">
          <h1 className="pg-title text-[2.75rem] leading-[1.06] text-ink">
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
        </section>

        {/* ── bento tiles ── */}
        <section id="features" className="mt-9 grid grid-cols-2 gap-3">
          {/* wide mint — no repeat posts */}
          <div className="pg-tile col-span-2 bg-mint p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/55">
                {/* little star-face mascot */}
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#2f2b5e"
                    d="M12 1.6c.7 3.9 1.9 6.4 3.6 8.1 1.7 1.7 4.2 2.9 8.1 3.6-3.9.7-6.4 1.9-8.1 3.6-1.7 1.7-2.9 4.2-3.6 8.1-.7-3.9-1.9-6.4-3.6-8.1-1.7-1.7-4.2-2.9-8.1-3.6 3.9-.7 6.4-1.9 8.1-3.6 1.7-1.7 2.9-4.2 3.6-8.1z"
                  />
                  <circle cx="9.6" cy="11.4" r="1.15" fill="#fff" />
                  <circle cx="14.4" cy="11.4" r="1.15" fill="#fff" />
                  <path d="M10 14.2c.6.7 1.3 1 2 1s1.4-.3 2-1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="pg-title text-[15px] text-ink">No repeat posts</h2>
                <p className="mt-0.5 text-xs leading-snug font-semibold text-ink-soft">
                  Exact-hash + similarity detection keeps your timeline fresh.
                </p>
              </div>
            </div>
          </div>

          {/* lilac — bring your own AI */}
          <div className="pg-tile bg-lilac p-4">
            <TileIcon>
              <svg {...ICON}>
                <rect x="5" y="8" width="14" height="11" rx="4" />
                <path d="M12 8V4M9 14h.01M15 14h.01M2 12v3M22 12v3" />
              </svg>
            </TileIcon>
            <h2 className="pg-title mt-3 text-[15px] text-ink">Bring your own AI</h2>
            <p className="mt-1 text-xs leading-snug font-semibold text-ink-soft">
              Claude, Gemini CLI or local models via REST/MCP — drafts only.
            </p>
          </div>

          {/* cream — private media */}
          <div className="pg-tile bg-cream p-4">
            <TileIcon>
              <svg {...ICON}>
                <rect x="3" y="5" width="18" height="14" rx="4" />
                <circle cx="9" cy="11" r="2" />
                <path d="M21 16l-5-5-8 8" />
              </svg>
            </TileIcon>
            <h2 className="pg-title mt-3 text-[15px] text-ink">Private media</h2>
            <p className="mt-1 text-xs leading-snug font-semibold text-ink-soft">
              Logos and shots in private R2 storage — yours only.
            </p>
          </div>

          {/* wide peach — posts & threads */}
          <div className="pg-tile col-span-2 bg-peach p-4">
            <div className="flex items-center gap-3">
              <TileIcon>
                <svg {...ICON}>
                  <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.4-.7L3 21l1.8-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
                </svg>
              </TileIcon>
              <div className="min-w-0">
                <h2 className="pg-title text-[15px] text-ink">Posts &amp; threads</h2>
                <p className="mt-0.5 text-xs leading-snug font-semibold text-ink-soft">
                  X-accurate counter, thread builder, one-click copy.
                </p>
              </div>
            </div>
          </div>

          {/* wide indigo CTA */}
          <Link
            to={session ? '/dashboard' : '/login'}
            className="pg-tile col-span-2 flex items-center justify-center gap-2 bg-ink py-4.5 text-white transition active:scale-[0.98]"
          >
            <span className="pg-title text-[17px]">
              {session ? 'Open dashboard' : 'Sign in'}
            </span>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </section>

        <footer className="mt-auto pt-9 text-center text-[11px] font-semibold text-ink-soft">
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
