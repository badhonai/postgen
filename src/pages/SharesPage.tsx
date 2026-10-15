import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useAcceptShare,
  useReceivedShares,
  useRespondShare,
  useSendShare,
  useSentShares,
  type SharePostPayload,
  type ShareProjectPayload,
  type SharePromptPayload,
} from '../features/shares/api'
import { useProjects } from '../features/projects/api'
import { usePosts } from '../features/posts/api'
import { useImagePrompts } from '../features/prompts/api'
import { SHARE_ITEM_LABEL, type Share, type ShareItemType } from '../lib/types'
import { Button, ErrorBox, Input, Select, Spinner } from '../components/ui'
import { cn } from '../lib/cn'

const ITEM_ICON: Record<ShareItemType, string> = { project: '📁', post: '💬', prompt: '🎨' }

function excerpt(share: Share): string {
  if (share.item_type === 'post') {
    const p = share.payload as unknown as SharePostPayload
    return p.tweets?.[0]?.slice(0, 140) ?? ''
  }
  if (share.item_type === 'project') {
    const p = share.payload as unknown as ShareProjectPayload
    const k = p.knowledge?.length ?? 0
    return `Project only — profile, brand & logos${k ? ` · ${k} knowledge item${k === 1 ? '' : 's'}` : ''}. No posts or other media.`
  }
  const p = share.payload as unknown as SharePromptPayload
  return p.prompt?.slice(0, 140) ?? ''
}

function personLabel(p?: { display_name: string | null; email: string | null } | null): string {
  return p?.display_name || p?.email || 'A PostGen user'
}

function StatusChip({ status }: { status: Share['status'] }) {
  const styles: Record<Share['status'], string> = {
    pending: 'bg-butter text-ink',
    accepted: 'bg-mint text-ink',
    declined: 'bg-rose-soft text-rose-700',
    cancelled: 'bg-white/60 text-ink-soft',
  }
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold capitalize', styles[status])}>
      {status}
    </span>
  )
}

function openLink(share: Share): string | null {
  const r = share.result ?? {}
  if (share.item_type === 'project' && r.projectId) return `/projects/${String(r.projectId)}`
  if (share.item_type === 'post') {
    if (r.postId) return `/posts/${String(r.postId)}`
    if (r.projectId) return `/projects/${String(r.projectId)}`
  }
  if (share.item_type === 'prompt' && r.promptId) return '/prompts'
  return null
}

export default function SharesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const received = useReceivedShares()
  const sent = useSentShares()
  const respond = useRespondShare()
  const accept = useAcceptShare()
  const projects = useProjects()
  const [destinations, setDestinations] = useState<Record<string, string>>({})
  const [acceptError, setAcceptError] = useState<string | null>(null)

  const receivedList = received.data ?? []
  const sentList = sent.data ?? []
  const pendingCount = receivedList.filter((s) => s.status === 'pending').length

  const doAccept = async (share: Share) => {
    setAcceptError(null)
    try {
      await accept.mutateAsync({ share, targetProjectId: destinations[share.id] || null })
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Could not accept this share')
    }
  }

  return (
    <main className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-16">
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/dashboard')}
            className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="pg-title truncate text-2xl text-ink">Shares</h1>
            <p className="truncate text-xs font-bold text-ink-soft">
              Send projects, posts & prompts — they land here first.
            </p>
          </div>
          <span className="text-2xl" aria-hidden>✉️</span>
        </header>

        {/* ── tabs ── */}
        <div className="pg-glass mt-5 flex gap-1 rounded-full p-1.5" role="tablist" aria-label="Shares">
          {(['received', 'sent'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-full px-1 py-2 text-[13px] font-extrabold capitalize transition',
                tab === t ? 'bg-butter text-ink shadow-[0_2px_10px_rgba(251,193,60,0.45)]' : 'text-ink-soft',
              )}
            >
              {t}
              {t === 'received' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>

        {acceptError ? (
          <div className="mt-4">
            <ErrorBox message={acceptError} />
          </div>
        ) : null}

        {tab === 'received' ? (
          <section className="mt-5 space-y-3">
            {received.isPending ? (
              <Spinner />
            ) : received.error ? (
              <ErrorBox message={received.error instanceof Error ? received.error.message : 'Failed to load shares'} />
            ) : receivedList.length === 0 ? (
              <div className="pg-glass rounded-[28px] p-8 text-center">
                <div className="text-3xl">📥</div>
                <h2 className="pg-title mt-3 text-lg text-ink">Nothing received yet</h2>
                <p className="mx-auto mt-1.5 max-w-[260px] text-sm font-semibold text-ink-soft">
                  When someone sends you a project, post or prompt, it shows up here for you to accept or decline.
                </p>
              </div>
            ) : (
              receivedList.map((share) => {
                const link = share.status === 'accepted' ? openLink(share) : null
                return (
                  <article key={share.id} className="pg-glass rounded-[24px] p-4">
                    <div className="flex items-center gap-2">
                      <span aria-hidden>{ITEM_ICON[share.item_type]}</span>
                      <span className="text-[11px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">
                        {SHARE_ITEM_LABEL[share.item_type]}
                      </span>
                      <span className="ml-auto">
                        <StatusChip status={share.status} />
                      </span>
                    </div>
                    <h3 className="pg-title mt-2 text-[17px] text-ink">{share.title || 'Untitled'}</h3>
                    <p className="mt-0.5 text-xs font-bold text-ink-soft">
                      From {personLabel(share.sender)} · {new Date(share.created_at).toLocaleDateString()}
                    </p>
                    {share.message ? (
                      <p className="mt-2 rounded-[14px] bg-white/55 px-3 py-2 text-sm font-semibold text-ink">
                        “{share.message}”
                      </p>
                    ) : null}
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed font-semibold text-ink-soft">
                      {excerpt(share)}
                    </p>

                    {share.status === 'pending' ? (
                      <>
                        {share.item_type === 'post' ? (
                          <label className="mt-3 block">
                            <span className="text-[11px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">
                              Add to project
                            </span>
                            <Select
                              value={destinations[share.id] ?? ''}
                              onChange={(e) => setDestinations((d) => ({ ...d, [share.id]: e.target.value }))}
                              className="mt-1 w-full py-2"
                            >
                              <option value="">
                                New project{share.payload && (share.payload as unknown as SharePostPayload).project_name
                                  ? ` — “${(share.payload as unknown as SharePostPayload).project_name}”`
                                  : ''}
                              </option>
                              {(projects.data ?? []).map((pr) => (
                                <option key={pr.id} value={pr.id}>
                                  {pr.name}
                                </option>
                              ))}
                            </Select>
                          </label>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <Button
                            className="flex-1 py-2.5"
                            disabled={accept.isPending}
                            onClick={() => void doAccept(share)}
                          >
                            {accept.isPending ? 'Accepting…' : 'Accept'}
                          </Button>
                          <Button
                            variant="ghost"
                            className="py-2.5"
                            disabled={respond.isPending}
                            onClick={() => respond.mutate({ share, action: 'declined' })}
                          >
                            Decline
                          </Button>
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-ink-soft">
                          Accepting adds your own copy — it won't show in your account until you do.
                        </p>
                      </>
                    ) : (
                      <div className="mt-3 flex items-center gap-2">
                        {link ? (
                          <Link
                            to={link}
                            className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition active:scale-95"
                          >
                            Open it →
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="ml-auto text-xs font-bold text-ink-soft hover:text-ink"
                          onClick={() => respond.mutate({ share, action: 'delete' })}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </section>
        ) : (
          <>
            <SendSomething />
            <section className="mt-5 space-y-3">
              {sent.isPending ? (
                <Spinner />
              ) : sent.error ? (
                <ErrorBox message={sent.error instanceof Error ? sent.error.message : 'Failed to load shares'} />
              ) : sentList.length === 0 ? (
                <div className="pg-glass rounded-[28px] p-8 text-center">
                  <div className="text-3xl">📤</div>
                  <h2 className="pg-title mt-3 text-lg text-ink">Nothing sent yet</h2>
                  <p className="mx-auto mt-1.5 max-w-[260px] text-sm font-semibold text-ink-soft">
                    Use the form above, or the Send option on any project, post or prompt.
                  </p>
                </div>
              ) : (
                sentList.map((share) => (
                  <article key={share.id} className="pg-glass rounded-[24px] p-4">
                    <div className="flex items-center gap-2">
                      <span aria-hidden>{ITEM_ICON[share.item_type]}</span>
                      <span className="text-[11px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">
                        {SHARE_ITEM_LABEL[share.item_type]}
                      </span>
                      <span className="ml-auto">
                        <StatusChip status={share.status} />
                      </span>
                    </div>
                    <h3 className="pg-title mt-2 text-[17px] text-ink">{share.title || 'Untitled'}</h3>
                    <p className="mt-0.5 text-xs font-bold text-ink-soft">
                      To {personLabel(share.recipient)} · {new Date(share.created_at).toLocaleDateString()}
                      {share.status === 'pending' ? ' · waiting for them to accept' : ''}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {share.status === 'pending' ? (
                        <Button
                          variant="ghost"
                          className="py-2 text-xs"
                          disabled={respond.isPending}
                          onClick={() => respond.mutate({ share, action: 'cancelled' })}
                        >
                          Cancel send
                        </Button>
                      ) : null}
                      <button
                        type="button"
                        className="ml-auto text-xs font-bold text-ink-soft hover:text-ink"
                        onClick={() => respond.mutate({ share, action: 'delete' })}
                      >
                        Clear
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

/** Compose a share right from the Shares page — pick any mix of items. */
function SendSomething() {
  const send = useSendShare()
  const projects = useProjects()
  const posts = usePosts({})
  const prompts = useImagePrompts()
  const [activeType, setActiveType] = useState<ShareItemType>('project')
  const [query, setQuery] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [doneCount, setDoneCount] = useState(0)

  type Pick = { itemType: ShareItemType; itemId: string; title: string }
  const groups: Array<{ type: ShareItemType; label: string; items: Pick[] }> = [
    {
      type: 'project',
      label: 'Projects',
      items: (projects.data ?? []).map((pr) => ({ itemType: 'project' as const, itemId: pr.id, title: pr.name })),
    },
    {
      type: 'post',
      label: 'Posts',
      items: (posts.data ?? []).map((pr) => ({
        itemType: 'post' as const,
        itemId: pr.id,
        title: pr.title || pr.content_text.slice(0, 60) || 'Untitled post',
      })),
    },
    {
      type: 'prompt',
      label: 'Prompts',
      items: (prompts.data?.prompts ?? []).map((pr) => ({ itemType: 'prompt' as const, itemId: pr.id, title: pr.name })),
    },
  ]
  const keyOf = (i: Pick) => `${i.itemType}:${i.itemId}`
  const allItems = groups.flatMap((g) => g.items)
  const selectedItems = allItems.filter((i) => selectedKeys.has(keyOf(i)))
  const selectedCountFor = (t: ShareItemType) => selectedItems.filter((i) => i.itemType === t).length
  const activeGroup = groups.find((g) => g.type === activeType) ?? groups[0]
  const visibleItems = activeGroup.items.filter((i) =>
    i.title.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((i) => selectedKeys.has(keyOf(i)))

  const toggle = (item: Pick) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      const k = keyOf(item)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const toggleAllVisible = () =>
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const i of visibleItems) {
        if (allVisibleSelected) next.delete(keyOf(i))
        else next.add(keyOf(i))
      }
      return next
    })

  const submit = async () => {
    if (selectedItems.length === 0 || !email.trim()) return
    await send.mutateAsync({ items: selectedItems, recipientEmail: email, message })
    setDoneCount(selectedItems.length)
    setSelectedKeys(new Set())
    setEmail('')
    setMessage('')
  }

  return (
    <section className="pg-glass mt-5 rounded-[24px] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="pg-title text-[17px] text-ink">Send something</h2>
        {selectedItems.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelectedKeys(new Set())}
            className="text-xs font-extrabold text-ink-soft hover:text-ink"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* Selected tray — always visible, no matter which tab you're on. */}
      {selectedItems.length > 0 ? (
        <div className="pg-scroll mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {selectedItems.map((item) => (
            <button
              key={keyOf(item)}
              type="button"
              onClick={() => toggle(item)}
              title={`Remove ${item.title}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink py-1.5 pr-2.5 pl-3 text-xs font-bold text-white transition active:scale-95"
            >
              <span aria-hidden>{ITEM_ICON[item.itemType]}</span>
              <span className="max-w-36 truncate">{item.title}</span>
              <span aria-hidden className="text-white/70">✕</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs font-semibold text-ink-soft">
          Pick anything — projects, posts and prompts can travel together.
        </p>
      )}

      {/* Type tabs: one list at a time, so long lists never bury the rest. */}
      <div className="mt-3 flex gap-1 rounded-full bg-white/45 p-1" role="tablist" aria-label="Item type">
        {groups.map((g) => {
          const count = selectedCountFor(g.type)
          return (
            <button
              key={g.type}
              type="button"
              role="tab"
              aria-selected={activeType === g.type}
              onClick={() => {
                setActiveType(g.type)
                setQuery('')
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-extrabold whitespace-nowrap transition active:scale-95',
                activeType === g.type
                  ? 'bg-butter text-ink shadow-[0_4px_12px_rgba(242,193,78,0.45)]'
                  : 'text-ink-soft hover:text-ink',
              )}
            >
              <span aria-hidden>{ITEM_ICON[g.type]}</span>
              {g.label}
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-soft">
                {g.items.length}
              </span>
              {count > 0 ? (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-extrabold text-white">
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Search + select-all for the visible list. */}
      <div className="mt-3 flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${activeGroup.label.toLowerCase()}…`}
          className="min-w-0 flex-1 py-2"
        />
        {visibleItems.length > 0 ? (
          <button
            type="button"
            onClick={toggleAllVisible}
            className="shrink-0 rounded-full bg-white/55 px-3 py-2 text-[11px] font-extrabold text-ink transition hover:bg-white/75 active:scale-95"
          >
            {allVisibleSelected ? 'Select none' : 'Select all'}
          </button>
        ) : null}
      </div>

      {/* Only the active type's list — fixed height, scrolls inside. */}
      {visibleItems.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm font-semibold text-ink-soft">
          {activeGroup.items.length === 0
            ? `No ${activeGroup.label.toLowerCase()} yet.`
            : `Nothing matches “${query}”.`}
        </p>
      ) : (
        <ul className="pg-scroll mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {visibleItems.map((item) => {
            const on = selectedKeys.has(keyOf(item))
            return (
              <li key={keyOf(item)}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(item)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-sm font-bold transition active:scale-[0.99]',
                    on
                      ? 'bg-butter text-ink shadow-[0_6px_16px_rgba(242,193,78,0.4)]'
                      : 'bg-white/55 text-ink hover:bg-white/75',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px]',
                      on ? 'border-ink bg-ink text-white' : 'border-ink-soft/40 text-transparent',
                    )}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {on ? <span className="shrink-0 text-[10px] font-extrabold text-ink/60">SELECTED</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Recipient's PostGen email"
        className="mt-4 w-full"
      />
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message (optional)"
        className="mt-2 w-full"
      />

      {send.error ? (
        <div className="mt-3">
          <ErrorBox message={send.error instanceof Error ? send.error.message : 'Could not send'} />
        </div>
      ) : null}
      {doneCount > 0 && !send.error ? (
        <p className="mt-3 rounded-[14px] bg-mint/60 px-3 py-2 text-sm font-bold text-ink">
          Sent {doneCount} item{doneCount === 1 ? '' : 's'} ✓ They'll see them in Shares → Received.
        </p>
      ) : null}

      <Button
        className="mt-3 w-full py-3"
        disabled={send.isPending || selectedItems.length === 0 || !email.trim()}
        onClick={() => void submit()}
      >
        {send.isPending
          ? 'Sending…'
          : selectedItems.length > 0
            ? `Send ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'}`
            : 'Select items to send'}
      </Button>
    </section>
  )
}
