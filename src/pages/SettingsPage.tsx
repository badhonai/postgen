import { useState } from 'react'
import { useAuth } from '../features/auth/context'
import {
  useAgentActivity,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '../features/agents/keys'
import { Button, ErrorBox, Input, Spinner } from '../components/ui'
import { ACCENTS, applyAccent, getAccent, type AccentId } from '../lib/theme'

const SWATCH: Record<AccentId, string> = {
  emerald: '#34d399',
  violet: '#a78bfa',
  amber: '#fbbf24',
  rose: '#fb7185',
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-[16px] bg-white/45">
      <div className="flex items-center justify-between border-b border-white/50 px-3 py-1.5">
        <span className="text-xs font-bold text-ink-soft">{title}</span>
        <Button
          variant="ghost"
          className="px-2.5 py-1 text-xs"
          onClick={() => {
            void navigator.clipboard.writeText(text)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed font-semibold whitespace-pre-wrap text-ink">
        {text}
      </pre>
    </div>
  )
}

function GroupTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-2 ml-1.5 text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
      {children}
    </h2>
  )
}

function Row({
  label,
  value,
  badge,
  chevron,
  onClick,
  children,
}: {
  label: string
  value?: string
  badge?: number
  chevron?: boolean
  onClick?: () => void
  children?: React.ReactNode
}) {
  const content = (
    <>
      <span className="text-[15px] font-bold text-ink">{label}</span>
      <span className="ml-auto flex items-center gap-2">
        {badge !== undefined ? (
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
            {badge}
          </span>
        ) : null}
        {value ? <span className="text-sm font-bold text-ink-soft">{value}</span> : null}
        {children}
        {chevron ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft">
            <path d="M9 18l6-6-6-6" />
          </svg>
        ) : null}
      </span>
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/35">
        {content}
      </button>
    )
  }
  return <div className="flex w-full items-center gap-3 px-4 py-3.5">{content}</div>
}

export default function SettingsPage() {
  const { user } = useAuth()
  const keys = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const activity = useAgentActivity()

  const [keyName, setKeyName] = useState('')
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [accent, setAccent] = useState<AccentId>(getAccent)
  const [open, setOpen] = useState<'keys' | 'mcp' | 'rest' | null>('keys')

  const origin = window.location.origin
  const toggle = (id: 'keys' | 'mcp' | 'rest') => setOpen((o) => (o === id ? null : id))

  return (
    <main className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-24">
        {/* ── header ── */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => window.history.back()}
            className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="pg-title text-2xl text-ink">Settings</h1>
        </header>

        {/* ── Appearance ── */}
        <section className="mt-7">
          <GroupTitle>Appearance</GroupTitle>
          <div className="pg-glass divide-y divide-white/50 overflow-hidden rounded-[22px]">
            <Row label="Accent">
              <span className="flex items-center gap-1.5">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    title={a.label}
                    aria-label={a.label}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                      accent === a.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-white/40' : ''
                    }`}
                    style={{ background: SWATCH[a.id] }}
                    onClick={() => {
                      applyAccent(a.id)
                      setAccent(a.id)
                    }}
                  />
                ))}
              </span>
            </Row>
            <Row label="Theme" value="Pastel" />
          </div>
        </section>

        {/* ── AI connections ── */}
        <section className="mt-7">
          <GroupTitle>AI connections</GroupTitle>
          <div className="pg-glass divide-y divide-white/50 overflow-hidden rounded-[22px]">
            <Row
              label="API keys"
              badge={(keys.data ?? []).filter((k) => !k.revoked_at).length}
              chevron
              onClick={() => toggle('keys')}
            />
            {open === 'keys' ? (
              <div className="space-y-3 px-4 pt-1 pb-4">
                <p className="text-xs font-semibold text-ink-soft">
                  External AI tools (Claude, Gemini CLI, n8n…) draft posts with these keys —
                  <strong className="text-ink"> drafts only</strong>, you approve. The secret is
                  shown once and stored only as a hash.
                </p>

                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!user) return
                    createKey.mutate(
                      { name: keyName, userId: user.id },
                      {
                        onSuccess: ({ key }) => {
                          setFreshKey(key)
                          setKeyName('')
                        },
                      },
                    )
                  }}
                >
                  <Input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="Key name — e.g. Claude Desktop"
                    className="flex-1 py-2"
                  />
                  <Button type="submit" disabled={createKey.isPending}>
                    {createKey.isPending ? '…' : 'Generate'}
                  </Button>
                </form>

                {createKey.error ? (
                  <ErrorBox
                    message={createKey.error instanceof Error ? createKey.error.message : 'Failed'}
                  />
                ) : null}

                {freshKey ? (
                  <div className="rounded-[16px] border border-emerald-300/70 bg-emerald-100/60 p-3">
                    <p className="text-xs font-bold text-emerald-800">
                      Copy this key now — it will not be shown again:
                    </p>
                    <code className="mt-1 block text-xs font-semibold break-all text-emerald-900">
                      {freshKey}
                    </code>
                    <Button variant="ghost" className="mt-2 px-2.5 py-1 text-xs" onClick={() => setFreshKey(null)}>
                      I saved it — hide
                    </Button>
                  </div>
                ) : null}

                {keys.isPending ? (
                  <Spinner />
                ) : keys.error ? (
                  <ErrorBox message={keys.error instanceof Error ? keys.error.message : 'Failed to load keys'} />
                ) : (keys.data ?? []).length === 0 ? (
                  <p className="text-xs font-semibold text-ink-soft">No API keys yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {(keys.data ?? []).map((k) => (
                      <li key={k.id} className="flex items-center justify-between gap-3 rounded-[16px] bg-white/45 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">
                            {k.name}{' '}
                            <code className="text-xs font-semibold text-ink-soft">pgk_live_{k.prefix}…</code>
                          </p>
                          <p className="text-[11px] font-semibold text-ink-soft">
                            created {new Date(k.created_at).toLocaleDateString()}
                            {k.last_used_at
                              ? ` · last used ${new Date(k.last_used_at).toLocaleString()}`
                              : ' · never used'}
                          </p>
                        </div>
                        {k.revoked_at ? (
                          <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold text-ink-soft">
                            revoked
                          </span>
                        ) : (
                          <Button
                            variant="danger"
                            className="shrink-0 px-2.5 py-1 text-xs"
                            disabled={revokeKey.isPending}
                            onClick={() => {
                              if (window.confirm(`Revoke “${k.name}”? Agents using it stop working immediately.`)) {
                                revokeKey.mutate(k.id)
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            <Row label="MCP server" value="Claude · Gemini" chevron onClick={() => toggle('mcp')} />
            {open === 'mcp' ? (
              <div className="space-y-3 px-4 pt-1 pb-4">
                <CopyBlock
                  title="Claude Desktop / Claude Code (via mcp-remote)"
                  text={`npx mcp-remote ${origin}/api/mcp \\\n  --header "Authorization: Bearer pgk_live_…"`}
                />
                <CopyBlock
                  title="Generic client config (Streamable HTTP)"
                  text={`{\n  "mcpServers": {\n    "postgen": {\n      "type": "http",\n      "url": "${origin}/api/mcp",\n      "headers": {\n        "Authorization": "Bearer pgk_live_…"\n      }\n    }\n  }\n}`}
                />
              </div>
            ) : null}

            <Row label="REST API" value="curl · OpenAPI" chevron onClick={() => toggle('rest')} />
            {open === 'rest' ? (
              <div className="space-y-3 px-4 pt-1 pb-4">
                <CopyBlock
                  title="Quick test (curl)"
                  text={`curl ${origin}/api/v1/projects \\\n  -H "Authorization: Bearer pgk_live_…"`}
                />
                <CopyBlock title="OpenAPI spec (connectors / codegen)" text={`${origin}/api/v1`} />
                <p className="text-[11px] font-semibold text-ink-soft">
                  Agent writes are drafts-only (idea/draft), 250 req/min &amp; 50 posts/day per key,
                  and every write runs the no-repeat guard. Everything is logged below.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Activity ── */}
        <section className="mt-7">
          <GroupTitle>Agent activity</GroupTitle>
          <div className="pg-glass divide-y divide-white/40 overflow-hidden rounded-[22px]">
            {activity.isPending ? (
              <div className="p-4">
                <Spinner />
              </div>
            ) : activity.error ? (
              <div className="p-4">
                <ErrorBox message={activity.error instanceof Error ? activity.error.message : 'Failed'} />
              </div>
            ) : (activity.data ?? []).length === 0 ? (
              <p className="px-4 py-5 text-xs font-semibold text-ink-soft">No agent activity yet.</p>
            ) : (
              (activity.data ?? []).map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 px-4 py-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-mint" />
                  <code className="shrink-0 text-xs font-bold text-ink">{a.action}</code>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-soft">
                    {a.target_table}
                    {a.target_id ? ` · ${a.target_id.slice(0, 8)}…` : ''}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold text-ink-soft">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
