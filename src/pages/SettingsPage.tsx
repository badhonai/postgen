import { useState, type ReactNode } from 'react'
import { useAuth } from '../features/auth/context'
import {
  useAgentActivity,
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useRevokeApiKey,
} from '../features/agents/keys'
import { Button, ErrorBox, Input, Spinner } from '../components/ui'
import { addAccount, forgetAccount, loadAccounts, switchAccount, type StoredAccount } from '../lib/accounts'
import { useProjects, useReorderProjects } from '../features/projects/api'
import { useGlobalInstructions, useSetGlobalInstructions } from '../features/profile/api'
import { buildAgentSetupText, buildMcpConfig } from '../features/agents/agentSetup'
import { ACCENTS, applyAccent, applyTheme, getAccent, getTheme, type AccentId, type ThemeMode } from '../lib/theme'
import TabBar from '../components/TabBar'
import {
  HOPE_VOICE_ID,
  useRemoveVoice,
  useSaveVoice,
  useTestVoice,
  useVoiceStatus,
} from '../features/voice/api'

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
    <h2 className="px-4 pt-3 pb-1 text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
      {children}
    </h2>
  )
}

const ROW_ICON = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function RowIcon({ tint, children }: { tint: string; children: ReactNode }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${tint} text-ink`}>
      {children}
    </span>
  )
}

function Row({
  label,
  value,
  badge,
  chevron,
  onClick,
  icon,
  children,
}: {
  label: string
  value?: string
  badge?: number
  chevron?: boolean
  onClick?: () => void
  icon?: ReactNode
  children?: ReactNode
}) {
  const content = (
    <>
      {icon}
      <span className="text-[15px] font-bold text-ink">{label}</span>
      <span className="ml-auto flex items-center gap-2">
        {badge !== undefined ? (
          <span className="rounded-full bg-butter/80 px-2 py-0.5 text-[11px] font-bold text-ink">
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

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export default function SettingsPage() {
  const { user } = useAuth()
  const keys = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const deleteKey = useDeleteApiKey()
  const activity = useAgentActivity()

  const [keyName, setKeyName] = useState('')
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [agentPack, setAgentPack] = useState<string | null>(null)
  const [agentKey, setAgentKey] = useState<string | null>(null)
  const [agentCopied, setAgentCopied] = useState(false)
  const [accent, setAccent] = useState<AccentId>(getAccent)
  const [theme, setTheme] = useState<ThemeMode>(getTheme)
  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }
  const [open, setOpen] = useState<'agent' | 'keys' | 'mcp' | 'rest' | 'voice' | null>(null)
  const [voiceKey, setVoiceKey] = useState('')
  const voiceStatus = useVoiceStatus()
  const saveVoice = useSaveVoice()
  const testVoice = useTestVoice()
  const removeVoice = useRemoveVoice()

  // ── account switching ──
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => loadAccounts())
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const submitAddAccount = () => {
    if (!addEmail.trim() || !addPassword) return
    setAddBusy(true)
    setAccountError(null)
    void addAccount(addEmail, addPassword)
      .then(() => {
        setAccounts(loadAccounts())
        setShowAdd(false)
        setAddEmail('')
        setAddPassword('')
      })
      .catch((err: unknown) => setAccountError(err instanceof Error ? err.message : 'Could not add that account'))
      .finally(() => setAddBusy(false))
  }
  const doSwitch = (acc: StoredAccount) => {
    setSwitchingId(acc.id)
    setAccountError(null)
    void switchAccount(acc).catch((err: unknown) => {
      setAccounts(loadAccounts())
      setAccountError(err instanceof Error ? err.message : 'Could not switch accounts')
      setSwitchingId(null)
    })
  }

  const origin = window.location.origin
  const toggle = (id: 'agent' | 'keys' | 'mcp' | 'rest' | 'voice') => setOpen((o) => (o === id ? null : id))

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  /** Build the paste-pack from a key we already hold (no new key created). */
  async function applyKeyToAgentPack(key: string) {
    const text = buildAgentSetupText(origin, key)
    setAgentKey(key)
    setAgentPack(text)
    setOpen('agent')
    if (await copyText(text)) {
      setAgentCopied(true)
      window.setTimeout(() => setAgentCopied(false), 2000)
    }
  }

  /** One click: mint a fresh key, embed it in the pack, and copy the pack. */
  function createAgentPack() {
    if (!user) return
    if (agentPack) {
      void copyText(agentPack).then((ok) => {
        if (ok) {
          setAgentCopied(true)
          window.setTimeout(() => setAgentCopied(false), 2000)
        }
      })
      return
    }
    createKey.mutate(
      { name: 'Agent (one-paste)', userId: user.id },
      { onSuccess: ({ key }) => void applyKeyToAgentPack(key) },
    )
  }

  const displayKey = agentKey ?? freshKey ?? 'pgk_live_…'

  const projectsQ = useProjects()
  const reorderProjects = useReorderProjects()
  const projectList2 = projectsQ.data ?? []
  const globalQ = useGlobalInstructions()
  const setGlobal = useSetGlobalInstructions()
  const [globalDraft, setGlobalDraft] = useState('')
  const [globalTouched, setGlobalTouched] = useState(false)
  const globalSaved = globalQ.data ?? ''
  const globalValue = globalTouched ? globalDraft : globalSaved
  const moveProject = (index: number, dir: -1 | 1) => {
    const ids = projectList2.map((p) => p.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    reorderProjects.mutate(ids)
  }
  const reorderError = reorderProjects.error
    ? /sort_order/.test(reorderProjects.error instanceof Error ? reorderProjects.error.message : '')
      ? 'Saving the order needs a one-time database update — run migration 20261016000007_project_sort_order.sql in Supabase.'
      : 'Could not save the new order.'
    : null

  return (
    <main className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-28">
        {/* ── header ── */}
        <header>
          <button
            type="button"
            aria-label="Back"
            onClick={() => window.history.back()}
            className="pg-glass flex h-11 w-11 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="pg-title mt-3 text-[2.6rem] leading-none text-ink">Settings</h1>
        </header>

        {/* ── Accounts: switch between signed-in accounts ── */}
        <section className="mt-7">
          <div className="pg-glass overflow-hidden rounded-[22px]">
            <GroupTitle>Accounts</GroupTitle>
            <div className="divide-y divide-white/50">
              {user ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-white">
                    {(user.email ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{user.email}</span>
                    <span className="block text-[11px] font-semibold text-ink-soft">This device is signed in as this account</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-butter/80 px-2.5 py-1 text-[10px] font-extrabold text-ink">CURRENT</span>
                </div>
              ) : null}
              {accounts
                .filter((a) => a.id !== user?.id)
                .map((acc) => (
                  <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-sm font-extrabold text-ink">
                      {acc.email.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{acc.email}</span>
                      <span className="block text-[11px] font-semibold text-ink-soft">Saved on this device</span>
                    </span>
                    <Button
                      variant="ghost"
                      className="shrink-0 px-3 py-1.5 text-xs"
                      disabled={switchingId !== null}
                      onClick={() => doSwitch(acc)}
                    >
                      {switchingId === acc.id ? 'Switching…' : 'Switch'}
                    </Button>
                    <button
                      type="button"
                      aria-label={`Remove ${acc.email} from this device`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/55 text-xs text-ink-soft transition hover:text-ink"
                      onClick={() => {
                        forgetAccount(acc.id)
                        setAccounts(loadAccounts())
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
            {showAdd ? (
              <div className="space-y-2 border-t border-white/50 px-4 py-3">
                <Input
                  type="email"
                  placeholder="Email of the other account"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAddAccount()
                  }}
                />
                <div className="flex items-center gap-2 pt-1">
                  <Button className="px-4 py-2 text-xs" disabled={addBusy || !addEmail.trim() || !addPassword} onClick={submitAddAccount}>
                    {addBusy ? 'Adding…' : 'Add account'}
                  </Button>
                  <Button variant="ghost" className="px-3 py-2 text-xs" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                </div>
                <p className="text-[11px] leading-relaxed font-semibold text-ink-soft">
                  The account is saved on this device only, so you can switch back and forth without
                  passwords. Don't add accounts on shared devices.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex w-full items-center gap-2 border-t border-white/50 px-4 py-3 text-left text-sm font-bold text-ink transition hover:bg-white/35"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/55 text-base leading-none">+</span>
                Add another account
              </button>
            )}
            {accountError ? <p className="px-4 pb-3 text-[11px] font-bold text-rose-700">{accountError}</p> : null}
          </div>
        </section>

        {/* ── Appearance ── */}
        <section className="mt-7">
          <div className="pg-glass divide-y divide-white/50 overflow-hidden rounded-[22px]">
            <GroupTitle>Appearance</GroupTitle>
            <Row
              label="Theme"
              value={theme === 'dark' ? 'Dark' : 'Light'}
              onClick={toggleTheme}
              icon={
                <RowIcon tint="bg-sky/60">
                  <svg {...ROW_ICON}>
                    <circle cx="13.5" cy="6.5" r=".8" />
                    <circle cx="17.5" cy="10.5" r=".8" />
                    <circle cx="8.5" cy="7.5" r=".8" />
                    <circle cx="6.5" cy="12.5" r=".8" />
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.2-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.6-10-8.6z" />
                  </svg>
                </RowIcon>
              }
            />
            <Row
              label="Accent"
              icon={
                <RowIcon tint="bg-lilac/70">
                  <svg {...ROW_ICON}>
                    <path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z" />
                  </svg>
                </RowIcon>
              }
            >
              <span className="flex items-center gap-1.5">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    title={a.label}
                    aria-label={a.label}
                    className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
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
          </div>
        </section>

        {/* ── Global instructions ── */}
        <section className="mt-7">
          <div className="pg-glass overflow-hidden rounded-[22px]">
            <GroupTitle>Instructions</GroupTitle>
            <div className="px-4 pb-4">
              <p className="text-[11px] leading-relaxed font-semibold text-ink-soft">
                <strong className="text-ink">Global instructions</strong> apply to{' '}
                <strong className="text-ink">every project</strong> you own. Put universal writing
                rules here once: format, length, what to avoid. Each project's own custom
                instructions then add only what's specific to that project.
              </p>
              <textarea
                value={globalValue}
                onChange={(e) => {
                  setGlobalTouched(true)
                  setGlobalDraft(e.target.value)
                }}
                rows={7}
                maxLength={4000}
                placeholder={'No emojis. No em dashes. Write between 20,000 and 24,990 characters. Use clean line gaps between sections…'}
                className="pg-scroll mt-2.5 w-full resize-y rounded-[16px] bg-white/55 px-3.5 py-3 text-sm leading-relaxed font-semibold text-ink placeholder:text-ink-soft/50 focus:ring-2 focus:ring-ink/60 focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  className="px-4 py-2 text-xs"
                  disabled={setGlobal.isPending || globalValue.trim() === globalSaved.trim()}
                  onClick={() =>
                    setGlobal.mutate(globalValue, { onSuccess: () => setGlobalTouched(false) })
                  }
                >
                  {setGlobal.isPending ? 'Saving…' : 'Save instructions'}
                </Button>
                <span className="text-[11px] font-semibold text-ink-soft">{globalValue.length}/4000</span>
                {setGlobal.isSuccess && !globalTouched ? (
                  <span className="text-[11px] font-bold text-ink-soft">Saved ✓ — agents see it on their next project load</span>
                ) : null}
              </div>
              {setGlobal.error ? (
                <p className="mt-2 text-[11px] font-bold text-rose-700">
                  {/global_instructions/.test(setGlobal.error instanceof Error ? setGlobal.error.message : '')
                    ? 'Saving needs a one-time database update — run migration 20261016000008_global_instructions.sql in Supabase.'
                    : 'Could not save. Try again.'}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── Projects: display order ── */}
        <section className="mt-7">
          <div className="pg-glass overflow-hidden rounded-[22px]">
            <GroupTitle>Projects</GroupTitle>
            <p className="px-4 pb-2 text-[11px] leading-relaxed font-semibold text-ink-soft">
              <strong className="text-ink">Show order</strong> — put your projects in any order you
              want with the arrows. They'll show in this order everywhere: dashboard, pickers, lists.
            </p>
            {projectsQ.isPending ? (
              <div className="px-4 pb-4">
                <Spinner />
              </div>
            ) : projectList2.length === 0 ? (
              <p className="px-4 pb-4 text-xs font-semibold text-ink-soft">No projects yet.</p>
            ) : (
              <div className="divide-y divide-white/50">
                {projectList2.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/55 text-[11px] font-extrabold text-ink-soft">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{p.name}</span>
                      {p.x_username ? (
                        <span className="block truncate text-[11px] font-semibold text-ink-soft">@{p.x_username}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Move ${p.name} up`}
                        disabled={i === 0}
                        onClick={() => moveProject(i, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/55 text-ink transition active:scale-95 disabled:opacity-30"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${p.name} down`}
                        disabled={i === projectList2.length - 1}
                        onClick={() => moveProject(i, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/55 text-ink transition active:scale-95 disabled:opacity-30"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {reorderProjects.isPending ? (
              <p className="px-4 pb-3 text-[11px] font-bold text-ink-soft">Saving order…</p>
            ) : reorderError ? (
              <p className="px-4 pb-3 text-[11px] font-bold text-rose-700">{reorderError}</p>
            ) : reorderProjects.isSuccess ? (
              <p className="px-4 pb-3 text-[11px] font-bold text-ink-soft">Order saved ✓</p>
            ) : null}
          </div>
        </section>

        {/* ── Voiceover provider ── */}
        <section className="mt-7">
          <div className="pg-glass divide-y divide-white/50 overflow-hidden rounded-[22px]">
            <GroupTitle>Voiceover</GroupTitle>
            <Row
              label="ElevenLabs voice"
              value={
                voiceStatus.data?.configured
                  ? `${voiceStatus.data.voice_name ?? 'configured'} · ${voiceStatus.data.remaining_today}/${voiceStatus.data.daily_limit} left today`
                  : 'Not configured'
              }
              chevron
              onClick={() => toggle('voice')}
              icon={
                <RowIcon tint="bg-sky/70">
                  <svg {...ROW_ICON}>
                    <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
                  </svg>
                </RowIcon>
              }
            />
            {open === 'voice' ? (
              <div className="space-y-3 px-4 pt-1 pb-4">
                <p className="text-xs leading-relaxed font-semibold text-ink-soft">
                  Your ElevenLabs key is sent once over HTTPS, verified, then stored{' '}
                  <strong className="text-ink">encrypted on the server</strong>. It is never
                  readable from the browser, never returned to an agent, and never shown again —
                  you will only see whether it is configured. Agents use it through{' '}
                  <code className="text-[11px]">generate_voiceover</code>, capped at{' '}
                  {voiceStatus.data?.daily_limit ?? 20}/day and{' '}
                  {voiceStatus.data?.per_script_limit ?? 2} attempts per identical script.
                </p>
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    saveVoice.mutate({ apiKey: voiceKey.trim(), voiceId: HOPE_VOICE_ID })
                  }}
                >
                  <Input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={voiceStatus.data?.configured ? 'Enter a new key to replace the saved one' : 'sk_… (ElevenLabs API key)'}
                    value={voiceKey}
                    onChange={(e) => setVoiceKey(e.target.value)}
                  />
                  <p className="text-[11px] font-semibold text-ink-soft">
                    Voice: Hope · upbeat and clear (<code className="text-[11px]">{HOPE_VOICE_ID}</code>)
                  </p>
                  <Button className="w-full" type="submit" disabled={!voiceKey.trim() || saveVoice.isPending}>
                    {saveVoice.isPending ? 'Verifying with ElevenLabs…' : 'Save key securely'}
                  </Button>
                </form>
                {saveVoice.error ? (
                  <ErrorBox
                    message={saveVoice.error instanceof Error ? saveVoice.error.message : 'Could not save'}
                  />
                ) : null}
                {saveVoice.isSuccess ? (
                  <p className="text-[11px] font-bold text-ink">Saved ✓ — the key will not be shown again.</p>
                ) : null}
                {voiceStatus.data?.configured ? (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="flex-1"
                        disabled={testVoice.isPending}
                        onClick={() => testVoice.mutate()}
                      >
                        {testVoice.isPending ? 'Checking…' : 'Test connection'}
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        disabled={removeVoice.isPending}
                        onClick={() => {
                          if (window.confirm('Remove the saved ElevenLabs key? Voiceover generation stops until you add one again.')) {
                            removeVoice.mutate()
                          }
                        }}
                      >
                        {removeVoice.isPending ? 'Removing…' : 'Remove key'}
                      </Button>
                    </div>
                    <p className="text-[11px] font-semibold text-ink-soft">
                      Provider: {voiceStatus.data.provider} · voice {voiceStatus.data.voice_id}
                      {voiceStatus.data.updated_at
                        ? ` · updated ${new Date(voiceStatus.data.updated_at).toLocaleDateString()}`
                        : ''}
                    </p>
                    {testVoice.isSuccess ? (
                      <p className="text-[11px] font-bold text-ink">
                        Connected ✓ — voice “{testVoice.data.voice_name ?? 'unknown'}” (no credits used).
                      </p>
                    ) : null}
                    {testVoice.error ? (
                      <ErrorBox
                        message={testVoice.error instanceof Error ? testVoice.error.message : 'Test failed'}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* ── AI connections ── */}
        <section className="mt-7">
          <div className="pg-glass divide-y divide-white/50 overflow-hidden rounded-[22px]">
            <GroupTitle>AI</GroupTitle>
            <Row
              label="Copy for your agent"
              value="One paste"
              chevron
              onClick={() => toggle('agent')}
              icon={
                <RowIcon tint="bg-mint/70">
                  <svg {...ROW_ICON}>
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                    <circle cx="12" cy="12" r="3.2" />
                  </svg>
                </RowIcon>
              }
            />
            {open === 'agent' ? (
              <div className="space-y-3 px-4 pt-1 pb-4">
                <p className="text-xs leading-relaxed font-semibold text-ink-soft">
                  One click creates a fresh API key and copies a ready-made brief for your AI:
                  the MCP link, the REST API, every tool, and the rules (drafts only, no repeats,
                  use my brand voice). Paste it into any agent chat — it connects, shows you your
                  projects, and waits for you to say what to write.{' '}
                  <strong className="text-ink">No explaining PostGen in chat.</strong>
                </p>
                <Button
                  className="w-full"
                  disabled={createKey.isPending || !user}
                  onClick={createAgentPack}
                >
                  {createKey.isPending
                    ? 'Creating key…'
                    : agentCopied
                      ? 'Copied ✓ — now paste it to your agent'
                      : agentPack
                        ? 'Copy again'
                        : 'Create key & copy for my agent'}
                </Button>
                {createKey.error ? (
                  <ErrorBox
                    message={createKey.error instanceof Error ? createKey.error.message : 'Failed to create key'}
                  />
                ) : null}
                {agentPack ? (
                  <>
                    <CopyBlock title="Paste this into your agent chat" text={agentPack} />
                    <p className="text-[11px] leading-relaxed font-semibold text-ink-soft">
                      ⚠️ This text contains a live API key — paste it only into your own agent,
                      never share it publicly. Revoke it anytime under API keys below.
                    </p>
                    <button
                      type="button"
                      className="text-xs font-bold text-ink underline underline-offset-2 disabled:opacity-50"
                      disabled={createKey.isPending || !user}
                      onClick={() => {
                        if (!user) return
                        createKey.mutate(
                          { name: 'Agent (one-paste)', userId: user.id },
                          { onSuccess: ({ key }) => void applyKeyToAgentPack(key) },
                        )
                      }}
                    >
                      Make a new one (new key)
                    </button>
                  </>
                ) : (
                  <p className="text-[11px] font-semibold text-ink-soft">
                    Each copy uses its own key named “Agent (one-paste)”, so you can revoke just
                    that agent later without touching your other keys.
                  </p>
                )}
              </div>
            ) : null}

            <Row
              label="API keys"
              badge={(keys.data ?? []).filter((k) => !k.revoked_at).length}
              chevron
              onClick={() => toggle('keys')}
              icon={
                <RowIcon tint="bg-butter/70">
                  <svg {...ROW_ICON}>
                    <circle cx="7.5" cy="15.5" r="3.5" />
                    <path d="M10.5 12.5L20 3M17 6l2.5 2.5M14.5 8.5L17 11" />
                  </svg>
                </RowIcon>
              }
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
                    placeholder="Key name — e.g. Claude"
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
                    <span className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => void applyKeyToAgentPack(freshKey)}
                      >
                        Copy agent setup with this key
                      </Button>
                      <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setFreshKey(null)}>
                        I saved it — hide
                      </Button>
                    </span>
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
                          <p className="text-[11px] font-semibold whitespace-nowrap text-ink-soft">
                            created {shortDate(k.created_at)}
                            {k.last_used_at ? ` · used ${shortDate(k.last_used_at)}` : ' · never used'}
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
                        <button
                          type="button"
                          aria-label={`Delete ${k.name}`}
                          title={`Delete ${k.name}`}
                          disabled={deleteKey.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete “${k.name}” for good? This removes the key entirely` +
                                  `${k.revoked_at ? '' : ' and it stops working right away'} — it cannot be undone.` +
                                  ' Past agent activity stays in the log.',
                              )
                            ) {
                              deleteKey.mutate(k.id)
                            }
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/75 bg-white/55 text-ink-soft transition hover:bg-white/80 hover:text-rose-600 active:scale-95 disabled:opacity-50"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            <Row
              label="MCP server"
              value="Claude · Gemini"
              chevron
              onClick={() => toggle('mcp')}
              icon={
                <RowIcon tint="bg-mint/70">
                  <svg {...ROW_ICON}>
                    <rect x="3" y="4" width="18" height="7" rx="2.5" />
                    <rect x="3" y="13" width="18" height="7" rx="2.5" />
                    <path d="M7 7.5h.01M7 16.5h.01" />
                  </svg>
                </RowIcon>
              }
            />
            {open === 'mcp' ? (
              <div className="space-y-3 px-4 pt-1 pb-4">
                {!agentKey && !freshKey ? (
                  <p className="text-[11px] font-semibold text-ink-soft">
                    Tip: “Copy for your agent” above creates a key and fills it in here automatically.
                    Existing keys can't be shown again — only their hash is stored.
                  </p>
                ) : null}
                <CopyBlock
                  title="Claude Desktop / Claude Code (via mcp-remote)"
                  text={`npx mcp-remote ${origin}/api/mcp \\\n  --header "Authorization: Bearer ${displayKey}"`}
                />
                <CopyBlock
                  title="Generic client config (Streamable HTTP)"
                  text={buildMcpConfig(origin, displayKey)}
                />
              </div>
            ) : null}

            <Row
              label="REST API"
              value="curl · OpenAPI"
              chevron
              onClick={() => toggle('rest')}
              icon={
                <RowIcon tint="bg-peach/70">
                  <svg {...ROW_ICON}>
                    <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 9.2 4.4 4.4 0 0 0 6.5 19z" />
                  </svg>
                </RowIcon>
              }
            />
            {open === 'rest' ? (
              <div className="space-y-3 px-4 pt-1 pb-4">
                <CopyBlock
                  title="Quick test (curl)"
                  text={`curl ${origin}/api/v1/projects \\\n  -H "Authorization: Bearer ${displayKey}"`}
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
          <div className="pg-glass divide-y divide-white/40 overflow-hidden rounded-[22px]">
            <GroupTitle>Activity</GroupTitle>
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
                  <span className="shrink-0 text-[11px] font-bold text-ink-soft">
                    {relTime(a.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <TabBar active="settings" />
    </main>
  )
}
