import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/context'
import { Button, ErrorBox, Spinner } from '../components/ui'
import {
  fetchXProfile,
  formatCount,
  xProfileScore,
  type XProfile,
} from '../lib/xprofile'
import { fetchSorsaScore, formatSorsaScore, SorsaError, sorsaTier } from '../lib/sorsa'

function Avatar({ handle, name, size }: { handle: string; name: string; size: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className="pg-glass flex items-center justify-center rounded-full font-display text-ink"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {(name || handle).slice(0, 1).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={`https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`}
      alt={`@${handle}`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-full object-cover ring-2 ring-white/80"
      style={{ width: size, height: size }}
    />
  )
}

function ScoreRing({ total }: { total: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="11" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="#f2c14e"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${(total / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="pg-title text-4xl leading-none text-ink">{total}</span>
        <span className="mt-1 text-[10px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
          / 100
        </span>
      </div>
    </div>
  )
}

function StatTile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className={`pg-tile ${tint} px-3 py-3 text-center`}>
      <p className="pg-title text-lg leading-none text-ink">{value}</p>
      <p className="mt-1 text-[10px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">
        {label}
      </p>
    </div>
  )
}

/**
 * Sorsa Score card — crypto-X influence (quality of followers), via the
 * /api/sorsa proxy (key is a server secret). Handles three states honestly:
 * a real score, "not connected" setup help, and "not indexed yet".
 */
function SorsaCard({ handle }: { handle: string }) {
  const sorsa = useQuery({
    queryKey: ['sorsa-score', handle],
    queryFn: () => fetchSorsaScore(handle),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  })

  if (sorsa.isPending) {
    return (
      <div className="pg-tile bg-sky p-5">
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Sorsa score</p>
        <div className="mt-3">
          <Spinner />
        </div>
      </div>
    )
  }

  if (sorsa.error || !sorsa.data) {
    const code = sorsa.error instanceof SorsaError ? sorsa.error.code : 'upstream'
    return (
      <div className="pg-tile bg-cream p-5">
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Sorsa score</p>
        {code === 'not_configured' ? (
          <>
            <p className="pg-title mt-1.5 text-xl text-ink">Not connected yet</p>
            <p className="mt-1 text-xs leading-relaxed font-semibold text-ink-soft">
              Sorsa Score measures crypto-X influence — which KOLs, projects and funds follow you.
              To show it here: get a free API key at{' '}
              <a href="https://api.sorsa.io/overview" target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2">
                api.sorsa.io
              </a>{' '}
              (100 free requests, no card), then add it as{' '}
              <code className="font-bold text-ink">SORSA_API_KEY</code> in Cloudflare Pages →
              Settings → Environment variables and redeploy. Scores update daily, so the card
              costs at most one request a day.
            </p>
          </>
        ) : code === 'not_indexed' ? (
          <>
            <p className="pg-title mt-1.5 text-xl text-ink">Not indexed yet</p>
            <p className="mt-1 text-xs leading-relaxed font-semibold text-ink-soft">
              Sorsa hasn't scored @{handle} yet — new accounts appear once notable crypto
              accounts follow them.{' '}
              <a
                href={`https://sorsa.io`}
                target="_blank"
                rel="noreferrer"
                className="text-ink underline underline-offset-2"
              >
                Check on Sorsa →
              </a>
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-xs leading-relaxed font-semibold text-ink-soft">
            {sorsa.error instanceof Error ? sorsa.error.message : 'Could not load the Sorsa Score.'}
          </p>
        )}
      </div>
    )
  }

  const { score } = sorsa.data
  const tier = sorsaTier(score)
  const progress = tier.nextAt
    ? Math.min(100, Math.max(2, ((score - tier.floor) / (tier.nextAt - tier.floor)) * 100))
    : 100

  return (
    <div className="pg-tile bg-sky p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Sorsa score</p>
          <p className="pg-title mt-1 text-4xl leading-none text-ink">{formatSorsaScore(score)}</p>
          <p className="mt-1.5 text-xs font-bold text-ink">
            Tier · {tier.label}
            {tier.nextAt ? (
              <span className="font-semibold text-ink-soft">
                {' '}— {formatSorsaScore(tier.nextAt - score)} pts to next tier
              </span>
            ) : null}
          </p>
        </div>
        <a
          href={`https://app.sorsa.io/profile/${encodeURIComponent(handle)}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-white/80"
        >
          Sorsa ↗
        </a>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/55">
        <div className="h-full rounded-full bg-butter-deep" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed font-semibold text-ink-soft">
        Crypto-X influence — who follows you (KOLs, projects, funds), not how many. By{' '}
        <a href="https://sorsa.io" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Sorsa
        </a>{' '}
        (formerly TweetScout) · updates daily.
      </p>
    </div>
  )
}

function ProfileDetails({ handle }: { handle: string }) {
  const profile = useQuery({
    queryKey: ['x-profile', handle],
    queryFn: () => fetchXProfile(handle),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  })

  if (profile.isPending) {
    return (
      <div className="pg-glass rounded-[24px] p-6">
        <Spinner />
      </div>
    )
  }
  if (profile.error || !profile.data) {
    return (
      <div className="space-y-3">
        <ErrorBox
          message={
            profile.error instanceof Error
              ? profile.error.message
              : 'Could not load your X profile.'
          }
        />
        <div className="pg-glass flex items-center gap-3 rounded-[24px] p-4">
          <Avatar handle={handle} name={handle} size={56} />
          <div>
            <p className="text-sm font-bold text-ink">@{handle}</p>
            <p className="text-xs font-semibold text-ink-soft">Public stats unavailable right now.</p>
          </div>
        </div>
      </div>
    )
  }

  const p: XProfile = profile.data
  const score = xProfileScore(p)

  return (
    <div className="space-y-3.5">
      {/* avatar + name */}
      <div className="pg-glass flex items-center gap-4 rounded-[24px] p-5">
        <Avatar handle={p.handle} name={p.name} size={76} />
        <div className="min-w-0">
          <p className="pg-title flex items-center gap-1.5 truncate text-xl text-ink">
            {p.name}
            {p.verified ? (
              <svg width="17" height="17" viewBox="0 0 24 24" className="shrink-0 text-sky-600">
                <path
                  fill="currentColor"
                  d="M12 2l2.2 2.1 3-.4 1.1 2.8 2.8 1.1-.4 3L22.9 12l-2.1 2.2.4 3-2.8 1.1-1.1 2.8-3-.4L12 22.9l-2.2-2.1-3 .4-1.1-2.8-2.8-1.1.4-3L1.1 12l2.1-2.2-.4-3 2.8-1.1 1.1-2.8 3 .4z"
                />
                <path fill="#fff" d="M10.6 15.6l-3-3 1.4-1.4 1.6 1.6 4.4-4.4 1.4 1.4z" />
              </svg>
            ) : null}
          </p>
          <p className="truncate text-sm font-bold text-ink-soft">@{p.handle}</p>
          {p.protectedAccount ? (
            <p className="mt-1 text-[11px] font-bold text-ink-soft">🔒 Protected account</p>
          ) : null}
        </div>
      </div>

      {/* score */}
      <div className="pg-tile bg-mint p-5">
        <div className="flex items-center gap-4">
          <ScoreRing total={score.total} />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
              X profile score
            </p>
            <p className="pg-title text-2xl text-ink">{score.label}</p>
            <p className="mt-1 text-xs font-semibold text-ink-soft">
              Computed on your device from public stats — no X API.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {score.parts.map((part) => (
            <div key={part.key}>
              <div className="flex items-baseline justify-between text-[11px] font-bold text-ink">
                <span>{part.label}</span>
                <span className="text-ink-soft">
                  {part.points}/{part.max}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/55">
                <div
                  className="h-full rounded-full bg-butter-deep"
                  style={{ width: `${(part.points / part.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <SorsaCard handle={p.handle} />

      {/* stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Followers" value={formatCount(p.followers)} tint="bg-lilac" />
        <StatTile label="Following" value={formatCount(p.following)} tint="bg-sky" />
        <StatTile label="Tweets" value={formatCount(p.tweets)} tint="bg-cream" />
        <StatTile label="Likes" value={formatCount(p.likes)} tint="bg-peach" />
      </div>

      {/* about */}
      {p.bio || p.location || p.website || p.joined ? (
        <div className="pg-glass rounded-[24px] p-5">
          <h2 className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
            About
          </h2>
          {p.bio ? (
            <p className="mt-2.5 text-sm leading-relaxed font-semibold whitespace-pre-wrap text-ink">
              {p.bio}
            </p>
          ) : null}
          <div className="mt-3 space-y-1.5 text-xs font-semibold text-ink-soft">
            {p.location ? <p>📍 {p.location}</p> : null}
            {p.website ? (
              <p>
                🔗{' '}
                <a href={p.website} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2">
                  {p.website}
                </a>
              </p>
            ) : null}
            {p.joined ? <p>🗓️ Joined {new Date(p.joined).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const metaHandle = String((user?.user_metadata as { x_username?: string } | undefined)?.x_username ?? '')
  const [editing, setEditing] = useState(false)
  const [handleInput, setHandleInput] = useState(metaHandle)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const saveHandle = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const cleaned = handleInput.trim().replace(/^@/, '')
      const { error } = await supabase!.auth.updateUser({ data: { x_username: cleaned } })
      if (error) throw error
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save handle')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-16">
        {/* header */}
        <header>
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/dashboard')}
            className="pg-glass flex h-11 w-11 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="pg-title text-[2.4rem] leading-none text-ink">Profile</h1>
            {metaHandle ? (
              <button
                type="button"
                aria-label="Edit X handle"
                onClick={() => {
                  setHandleInput(metaHandle)
                  setEditing((v) => !v)
                }}
                className="pg-glass mt-1 flex h-9 w-9 items-center justify-center rounded-full text-ink transition active:scale-95"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            ) : null}
          </div>
        </header>

        {/* handle form (edit / add) */}
        {editing || !metaHandle ? (
          <form className="pg-glass mt-5 rounded-[22px] p-4" onSubmit={saveHandle}>
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
              {metaHandle ? 'Change X handle' : 'Add your X handle'}
            </p>
            <div className="mt-2.5 flex gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-2xl border border-white/70 bg-white/85 px-3.5 py-2.5">
                <span className="text-sm font-bold text-ink-soft">@</span>
                <input
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="yourhandle"
                  aria-label="X handle"
                  className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-soft/70 focus:outline-none"
                />
              </div>
              <Button type="submit" disabled={saving || !handleInput.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {saveError ? <div className="mt-2"><ErrorBox message={saveError} /></div> : null}
            <p className="mt-2.5 text-xs font-semibold text-ink-soft">
              Used only to show your public X profile here. Read-only, free public data — no X
              API, nothing posted on your behalf.
            </p>
          </form>
        ) : null}

        {/* x profile */}
        {metaHandle && !editing ? (
          <div className="mt-5">
            <ProfileDetails handle={metaHandle} />
          </div>
        ) : null}

        {/* account */}
        <div className="pg-glass mt-7 divide-y divide-white/50 overflow-hidden rounded-[22px]">
          <p className="px-4 pt-3 pb-1 text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
            Account
          </p>
          <div className="px-4 py-3.5">
            <p className="text-[15px] font-bold text-ink">{user?.email}</p>
            <p className="text-xs font-semibold text-ink-soft">Invite-only PostGen account</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/35"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-sky/60 text-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 2.6 15H2.5a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 2.6V2.5a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 21.4 9h.1a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.2 1.4z" />
              </svg>
            </span>
            <span className="text-[15px] font-bold text-ink">Settings</span>
            <span className="ml-auto text-ink-soft">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/35"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-rose-soft/70 text-rose-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </span>
            <span className="text-[15px] font-bold text-rose-700">Sign out</span>
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed font-semibold text-ink-soft">
          Public profile data via{' '}
          <a href="https://fxtwitter.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            FxTwitter
          </a>{' '}
          · score computed on your device · no X API, no cost. Sorsa Score via Sorsa (free API tier)
          when connected.
          <br />
          <Link to="/" className="underline underline-offset-2">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}
