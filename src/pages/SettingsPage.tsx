import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import {
  useAgentActivity,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '../features/agents/keys'
import { Button, Card, ErrorBox, Field, Input, Spinner } from '../components/ui'
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        <Button
          variant="ghost"
          className="px-2 py-0.5 text-xs"
          onClick={() => {
            void navigator.clipboard.writeText(text)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs whitespace-pre-wrap text-zinc-300">{text}</pre>
    </div>
  )
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

  const origin = window.location.origin

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link to="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>

      {/* ── Appearance ── */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-zinc-400">Pick an accent theme — applies instantly.</p>
        <div className="mt-3 flex gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.label}
              aria-label={a.label}
              className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${
                accent === a.id ? 'border-zinc-100' : 'border-transparent'
              }`}
              style={{ background: SWATCH[a.id] }}
              onClick={() => {
                applyAccent(a.id)
                setAccent(a.id)
              }}
            />
          ))}
        </div>
      </section>

      {/* ── API keys ── */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">AI connections</h2>
        <p className="mt-1 text-sm text-zinc-400">
          API keys let external AI tools (Claude, Gemini CLI, n8n…) draft posts in PostGen.
          Keys are <strong className="text-zinc-200">drafts-only</strong> — you approve and publish.
          The secret is shown once and stored only as a hash.
        </p>

        <Card className="mt-4">
          <form
            className="flex items-end gap-3"
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
            <Field label="Key name">
              <Input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Claude Desktop"
                className="w-56"
              />
            </Field>
            <Button type="submit" disabled={createKey.isPending}>
              {createKey.isPending ? 'Generating…' : 'Generate key'}
            </Button>
          </form>

          {createKey.error ? (
            <div className="mt-3">
              <ErrorBox
                message={createKey.error instanceof Error ? createKey.error.message : 'Failed'}
              />
            </div>
          ) : null}

          {freshKey ? (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
              <p className="text-xs font-medium text-emerald-300">
                Copy this key now — it will not be shown again:
              </p>
              <code className="mt-1 block text-xs break-all text-emerald-200">{freshKey}</code>
              <Button variant="ghost" className="mt-2 px-2 py-1 text-xs" onClick={() => setFreshKey(null)}>
                I saved it — hide
              </Button>
            </div>
          ) : null}
        </Card>

        <div className="mt-4">
          {keys.isPending ? (
            <Spinner />
          ) : keys.error ? (
            <ErrorBox message={keys.error instanceof Error ? keys.error.message : 'Failed to load keys'} />
          ) : (keys.data ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No API keys yet.</p>
          ) : (
            <ul className="space-y-2">
              {(keys.data ?? []).map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">
                      {k.name}{' '}
                      <code className="text-xs text-zinc-500">pgk_live_{k.prefix}…</code>
                    </p>
                    <p className="text-xs text-zinc-500">
                      created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString()}` : ' · never used'}
                    </p>
                  </div>
                  {k.revoked_at ? (
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                      revoked
                    </span>
                  ) : (
                    <Button
                      variant="danger"
                      className="shrink-0 px-2 py-1 text-xs"
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
      </section>

      {/* ── Connect your AI ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Connect your AI tools</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Use these with any key from above. Nothing in PostGen is paid — these just connect
          your existing free AI tools.
        </p>
        <div className="mt-4 space-y-3">
          <CopyBlock
            title="REST API — quick test (curl)"
            text={`curl ${origin}/api/v1/projects \\\n  -H "Authorization: Bearer pgk_live_…"`}
          />
          <CopyBlock
            title="MCP — Claude Desktop / Claude Code (via mcp-remote)"
            text={`npx mcp-remote ${origin}/api/mcp \\\n  --header "Authorization: Bearer pgk_live_…"`}
          />
          <CopyBlock
            title="MCP — generic client config (Streamable HTTP)"
            text={`{\n  "mcpServers": {\n    "postgen": {\n      "type": "http",\n      "url": "${origin}/api/mcp",\n      "headers": {\n        "Authorization": "Bearer pgk_live_…"\n      }\n    }\n  }\n}`}
          />
          <CopyBlock
            title="OpenAPI spec (for ChatGPT connectors / codegen)"
            text={`${origin}/api/v1`}
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Agent writes are limited to drafts (idea/draft), 250 req/min &amp; 50 posts/day per key,
          and every write runs the no-repeat guard. Everything they do is logged below.
        </p>
      </section>

      {/* ── Activity ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Agent activity</h2>
        {activity.isPending ? (
          <Spinner />
        ) : activity.error ? (
          <ErrorBox message={activity.error instanceof Error ? activity.error.message : 'Failed'} />
        ) : (activity.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No agent activity yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {(activity.data ?? []).map((a) => (
              <li key={a.id} className="flex items-baseline gap-2 text-sm">
                <code className="text-xs text-emerald-400">{a.action}</code>
                <span className="truncate text-zinc-400">
                  {a.target_table}
                  {a.target_id ? ` · ${a.target_id.slice(0, 8)}…` : ''}
                </span>
                <span className="ml-auto shrink-0 text-xs text-zinc-600">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
