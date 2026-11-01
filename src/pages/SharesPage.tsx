import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { useAuth } from '../features/auth/context'
import { SHARE_ITEM_LABEL, type Share, type ShareItemType } from '../lib/types'
import { Button, ErrorBox, Input, Select } from '../components/ui'
import { getRecentRecipients, rememberRecipient } from '../lib/recipients'
import { loadChatMessages, sendChatMessage, type ChatMessage } from '../lib/chat'
import TabBar from '../components/TabBar'
import { cn } from '../lib/cn'

const ITEM_ICON: Record<ShareItemType, string> = { project: '📁', post: '💬', prompt: '🎨' }

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function exactWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function excerpt(share: Share): string {
  if (share.item_type === 'post') {
    const p = share.payload as unknown as SharePostPayload
    return p.tweets?.[0]?.slice(0, 140) ?? ''
  }
  if (share.item_type === 'project') {
    const p = share.payload as unknown as ShareProjectPayload
    const k = p.knowledge?.length ?? 0
    return `Project profile & brand${k ? ` · ${k} knowledge item${k === 1 ? '' : 's'}` : ''}`
  }
  const p = share.payload as unknown as SharePromptPayload
  return p.prompt?.slice(0, 140) ?? ''
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

interface ChatThreadItem {
  id: string
  kind: 'share' | 'message'
  createdAt: string
  isMe: boolean
  share?: Share
  message?: ChatMessage
}

function ShareBubbleCard({
  share,
  isMe,
  destinationProjectId,
  onDestinationChange,
  projects,
  acceptPending,
  respondPending,
  onAccept,
  onDecline,
}: {
  share: Share
  isMe: boolean
  destinationProjectId?: string
  onDestinationChange: (id: string) => void
  projects: Array<{ id: string; name: string }>
  acceptPending: boolean
  respondPending: boolean
  onAccept: (share: Share) => void
  onDecline: (share: Share) => void
}) {
  return (
    <div className="space-y-2">
      {share.message ? (
        <p className="mb-2 leading-relaxed font-semibold opacity-90">{share.message}</p>
      ) : null}

      <div className={cn('rounded-[16px] p-3 text-left', isMe ? 'bg-white/12 text-white' : 'bg-black/4 text-ink')}>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-80">
            {ITEM_ICON[share.item_type]} {SHARE_ITEM_LABEL[share.item_type]}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[9px] font-black uppercase',
              share.status === 'accepted'
                ? 'bg-emerald-500/20 text-emerald-300'
                : share.status === 'declined'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-amber-400/20 text-amber-300',
            )}
          >
            {share.status}
          </span>
        </div>

        <p className="mt-1 font-black text-xs leading-snug">{share.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] opacity-80">{excerpt(share)}</p>

        {!isMe && share.status === 'pending' ? (
          <div className="mt-2.5 pt-2 border-t border-black/8 space-y-1.5">
            {share.item_type === 'post' ? (
              <Select
                value={destinationProjectId ?? ''}
                onChange={(e) => onDestinationChange(e.target.value)}
                className="w-full text-xs py-1"
              >
                <option value="">Destination project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            ) : null}

            <div className="flex gap-1.5">
              <Button
                variant="accent"
                className="flex-1 py-1.5 text-xs font-extrabold"
                disabled={acceptPending}
                onClick={() => onAccept(share)}
              >
                Accept & Import
              </Button>
              <Button
                variant="ghost"
                className="py-1.5 text-xs"
                disabled={respondPending}
                onClick={() => onDecline(share)}
              >
                Decline
              </Button>
            </div>
          </div>
        ) : null}

        {share.status === 'accepted' && openLink(share) ? (
          <div className="mt-2 pt-1.5 border-t border-black/8">
            <Link
              to={openLink(share)!}
              className={cn('text-[11px] font-black underline', isMe ? 'text-white' : 'text-ink')}
            >
              Open in PostGen →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function SharesPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const received = useReceivedShares()
  const sent = useSentShares()
  const accept = useAcceptShare()
  const respond = useRespondShare()
  const send = useSendShare()

  const projects = useProjects()
  const posts = usePosts({})
  const prompts = useImagePrompts()

  const [activeContactEmail, setActiveContactEmail] = useState<string | null>(
    () => searchParams.get('with')?.toLowerCase() ?? null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [textDraft, setTextDraft] = useState('')
  const [selectedAttachment, setSelectedAttachment] = useState<{
    itemType: ShareItemType
    itemId: string
    title: string
    subtitle?: string
  } | null>(null)
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<ShareItemType>('post')
  const [pickerSearch, setPickerSearch] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newChatEmail, setNewChatEmail] = useState('')
  const [destinations, setDestinations] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(loadChatMessages)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const refresh = () => setChatMessages(loadChatMessages())
    window.addEventListener('postgen_chat_messages_updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('postgen_chat_messages_updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    if (activeContactEmail) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeContactEmail, received.data, sent.data, chatMessages.length])

  const receivedList = received.data ?? []
  const sentList = sent.data ?? []
  const myEmail = user?.email?.toLowerCase() ?? ''

  // Group all shares and chat messages into contacts / conversations
  const conversations = useMemo(() => {
    type ContactData = {
      email: string
      displayName: string
      shares: Share[]
      messages: ChatMessage[]
      pendingCount: number
      latestTimestamp: string
      latestSnippet: string
    }

    const map = new Map<string, ContactData>()

    const ensureContact = (email: string, displayName?: string | null): ContactData => {
      const key = email.trim().toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          email: key,
          displayName: displayName || key.split('@')[0],
          shares: [],
          messages: [],
          pendingCount: 0,
          latestTimestamp: '',
          latestSnippet: '',
        })
      }
      return map.get(key)!
    }

    // Add received shares
    for (const sh of receivedList) {
      const senderEmail = sh.sender?.email?.toLowerCase()
      if (!senderEmail) continue
      const c = ensureContact(senderEmail, sh.sender?.display_name)
      c.shares.push(sh)
      if (sh.status === 'pending') c.pendingCount++
      if (!c.latestTimestamp || sh.created_at > c.latestTimestamp) {
        c.latestTimestamp = sh.created_at
        c.latestSnippet = sh.message || `Shared ${SHARE_ITEM_LABEL[sh.item_type]}: ${sh.title}`
      }
    }

    // Add sent shares
    for (const sh of sentList) {
      const recipientEmail = sh.recipient?.email?.toLowerCase()
      if (!recipientEmail) continue
      const c = ensureContact(recipientEmail, sh.recipient?.display_name)
      c.shares.push(sh)
      if (!c.latestTimestamp || sh.created_at > c.latestTimestamp) {
        c.latestTimestamp = sh.created_at
        c.latestSnippet = sh.message || `Sent ${SHARE_ITEM_LABEL[sh.item_type]}: ${sh.title}`
      }
    }

    // Add chat messages
    for (const msg of chatMessages) {
      const otherEmail =
        msg.senderEmail === myEmail ? msg.recipientEmail : msg.senderEmail
      if (!otherEmail || otherEmail === myEmail) continue
      const c = ensureContact(otherEmail)
      c.messages.push(msg)
      if (!c.latestTimestamp || msg.createdAt > c.latestTimestamp) {
        c.latestTimestamp = msg.createdAt
        c.latestSnippet = msg.text
      }
    }

    // Add recent recipients even if no messages yet
    for (const email of getRecentRecipients()) {
      if (email.toLowerCase() !== myEmail) {
        ensureContact(email)
      }
    }

    const list = Array.from(map.values())
    list.sort((a, b) => b.latestTimestamp.localeCompare(a.latestTimestamp))
    return list
  }, [receivedList, sentList, chatMessages, myEmail])

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.latestSnippet.toLowerCase().includes(q),
    )
  }, [conversations, searchQuery])

  // Current active conversation's merged message thread
  const activeThread = useMemo((): ChatThreadItem[] => {
    if (!activeContactEmail) return []
    const cleanEmail = activeContactEmail.toLowerCase()
    const items: ChatThreadItem[] = []

    // Received shares from this contact
    for (const sh of receivedList) {
      if (sh.sender?.email?.toLowerCase() === cleanEmail) {
        items.push({
          id: `share_${sh.id}`,
          kind: 'share',
          createdAt: sh.created_at,
          isMe: false,
          share: sh,
        })
      }
    }

    // Sent shares to this contact
    for (const sh of sentList) {
      if (sh.recipient?.email?.toLowerCase() === cleanEmail) {
        items.push({
          id: `share_${sh.id}`,
          kind: 'share',
          createdAt: sh.created_at,
          isMe: true,
          share: sh,
        })
      }
    }

    // Chat messages
    for (const msg of chatMessages) {
      const isWith =
        msg.conversationEmail === cleanEmail ||
        msg.senderEmail === cleanEmail ||
        msg.recipientEmail === cleanEmail
      if (isWith) {
        items.push({
          id: msg.id,
          kind: 'message',
          createdAt: msg.createdAt,
          isMe: msg.senderEmail === myEmail,
          message: msg,
        })
      }
    }

    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return items
  }, [activeContactEmail, receivedList, sentList, chatMessages, myEmail])

  const activeContact = conversations.find((c) => c.email === activeContactEmail)

  // Handle Send action in chat
  const handleSend = async () => {
    if (!activeContactEmail) return
    setActionError(null)

    const text = textDraft.trim()
    if (!text && !selectedAttachment) return

    try {
      if (selectedAttachment) {
        // Send as a real PostGen share with full frozen payload
        await send.mutateAsync({
          items: [selectedAttachment],
          recipientEmail: activeContactEmail,
          message: text,
        })
      } else {
        // Send as pure chat message
        sendChatMessage(myEmail, activeContactEmail, text)
      }

      rememberRecipient(activeContactEmail)
      setTextDraft('')
      setSelectedAttachment(null)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to send')
    }
  }

  // Handle Accept share
  const handleAccept = async (share: Share) => {
    setActionError(null)
    try {
      await accept.mutateAsync({
        share,
        targetProjectId: destinations[share.id] || null,
      })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not accept share')
    }
  }

  // Handle Decline share
  const handleDecline = async (share: Share) => {
    setActionError(null)
    try {
      await respond.mutateAsync({ share, action: 'declined' })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not decline share')
    }
  }

  return (
    <main className="pg-shell min-h-dvh">
      <div className="mx-auto max-w-[440px] px-4 pt-6 pb-28">
        {/* ═════════════════════════════════════════════════════════════════
            VIEW A: CONVERSATION LIST (INBOX)
            ═════════════════════════════════════════════════════════════════ */}
        {!activeContactEmail ? (
          <div>
            {/* Header */}
            <header className="flex items-center justify-between gap-3">
              <div>
                <h1 className="pg-title text-2xl text-ink">Inbox</h1>
                <p className="mt-0.5 text-xs font-bold text-ink-soft">
                  Chat & share posts, prompts and projects
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNewChatOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
              >
                <span>+</span> New Chat
              </button>
            </header>

            {/* Search bar */}
            <div className="mt-4">
              <Input
                placeholder="Search conversations by name or message…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            {/* Quick Collaborator Avatars Row */}
            {conversations.length > 0 ? (
              <div className="pg-scroll mt-4 flex gap-3 overflow-x-auto pb-1">
                {conversations.slice(0, 6).map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => setActiveContactEmail(c.email)}
                    className="flex shrink-0 flex-col items-center gap-1 transition active:scale-90"
                  >
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-violet-400 to-pink-300 text-sm font-black text-white shadow-sm ring-2 ring-white">
                      {c.displayName.slice(0, 2).toUpperCase()}
                      {c.pendingCount > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                          {c.pendingCount}
                        </span>
                      ) : null}
                    </div>
                    <span className="max-w-14 truncate text-[10px] font-extrabold text-ink">
                      {c.displayName}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Conversation Threads List */}
            <section className="mt-4 space-y-2">
              {filteredConversations.length === 0 ? (
                <div className="pg-glass mt-6 rounded-[28px] p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lilac text-ink">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="3" />
                      <path d="m3.5 7 8.5 6 8.5-6" />
                    </svg>
                  </div>
                  <h2 className="pg-title mt-4 text-xl text-ink">Your Creator Inbox</h2>
                  <p className="mx-auto mt-2 max-w-[280px] text-xs font-semibold text-ink-soft">
                    Chat with teammates and send posts, prompts, or projects directly to their PostGen library.
                  </p>
                  <Button
                    className="mt-5 py-2.5 text-xs font-extrabold"
                    onClick={() => setNewChatOpen(true)}
                  >
                    Start a conversation
                  </Button>
                </div>
              ) : (
                filteredConversations.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => setActiveContactEmail(c.email)}
                    className="pg-glass flex w-full items-center gap-3.5 rounded-[22px] p-3.5 text-left transition active:scale-[0.99]"
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500/20 to-pink-500/20 font-display text-sm font-black text-ink ring-1 ring-black/5">
                      {c.displayName.slice(0, 2).toUpperCase()}
                      {c.pendingCount > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                          {c.pendingCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-black text-ink">{c.displayName}</p>
                        {c.latestTimestamp ? (
                          <span className="shrink-0 text-[10px] font-bold text-ink-soft">
                            {timeAgo(c.latestTimestamp)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11.5px] font-semibold text-ink-soft">
                        {c.latestSnippet || c.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </section>
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════════
             VIEW B: ACTIVE CHAT VIEW
             ═════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col">
            {/* Chat Header */}
            <header className="sticky top-0 z-20 -mx-4 -mt-2 flex items-center justify-between border-b border-black/5 bg-white/70 px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label="Back to conversations"
                  onClick={() => {
                    setActiveContactEmail(null)
                    setSelectedAttachment(null)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-black/5 active:scale-95"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div>
                  <p className="text-xs font-black text-ink leading-tight">
                    {activeContact?.displayName || activeContactEmail}
                  </p>
                  <p className="text-[10px] font-bold text-ink-soft leading-tight truncate max-w-[200px]">
                    {activeContactEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAttachmentPickerOpen(true)}
                  className="rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-extrabold text-ink transition hover:bg-ink hover:text-white active:scale-95"
                >
                  + Send Item
                </button>
              </div>
            </header>

            {actionError ? (
              <div className="mt-3">
                <ErrorBox message={actionError} />
              </div>
            ) : null}

            {/* Chat Thread Messages */}
            <div className="mt-4 space-y-3 pb-3">
              {activeThread.length === 0 ? (
                <div className="rounded-[22px] bg-white/40 p-6 text-center">
                  <p className="text-xs font-bold text-ink-soft">
                    Start of conversation with {activeContactEmail}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-ink-soft">
                    Send a message below or attach a post, prompt, or project.
                  </p>
                </div>
              ) : (
                activeThread.map((item) => (
                  <div
                    key={item.id}
                    className={cn('flex flex-col', item.isMe ? 'items-end' : 'items-start')}
                  >
                    {/* Chat Bubble */}
                    <div
                      className={cn(
                        'max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-xs shadow-xs',
                        item.isMe
                          ? 'rounded-tr-xs bg-ink text-white'
                          : 'rounded-tl-xs bg-white/80 text-ink ring-1 ring-black/5',
                      )}
                    >
                      {/* Pure Text Message */}
                      {item.kind === 'message' && item.message ? (
                        <p className="leading-relaxed font-semibold">{item.message.text}</p>
                      ) : null}

                      {/* Shared Item Card */}
                      {item.kind === 'share' && item.share ? (
                        <ShareBubbleCard
                          share={item.share}
                          isMe={item.isMe}
                          destinationProjectId={destinations[item.share.id]}
                          onDestinationChange={(targetId) =>
                            setDestinations({ ...destinations, [item.share!.id]: targetId })
                          }
                          projects={projects.data ?? []}
                          acceptPending={accept.isPending}
                          respondPending={respond.isPending}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                        />
                      ) : null}
                    </div>

                    {/* Timestamp */}
                    <span className="mt-1 px-1 text-[9.5px] font-bold text-ink-soft">
                      {exactWhen(item.createdAt)}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Fixed Bottom Chat Input Bar ── */}
            <div className="sticky bottom-16 z-20 mt-2">
              <div className="pg-glass-strong rounded-[24px] p-2 shadow-lg">
                {/* Attached Item Preview Chip */}
                {selectedAttachment ? (
                  <div className="mb-2 flex items-center justify-between rounded-[14px] bg-ink/10 px-3 py-1.5 text-xs font-bold text-ink">
                    <span className="truncate">
                      {ITEM_ICON[selectedAttachment.itemType]} Attached:{' '}
                      <strong>{selectedAttachment.title}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAttachment(null)}
                      className="ml-2 font-black text-ink-soft hover:text-ink"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}

                {/* Input row */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Attach item"
                    title="Attach Post, Prompt, or Project"
                    onClick={() => setAttachmentPickerOpen(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-ink transition hover:bg-white active:scale-95"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>

                  <input
                    type="text"
                    placeholder={
                      selectedAttachment
                        ? 'Add note to this item…'
                        : 'Type message or attach item…'
                    }
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleSend()
                      }
                    }}
                    className="min-w-0 flex-1 rounded-full bg-white/70 px-4 py-2.5 text-xs font-semibold text-ink placeholder:text-ink-soft/70 outline-none"
                  />

                  <button
                    type="button"
                    aria-label="Send"
                    disabled={!textDraft.trim() && !selectedAttachment}
                    onClick={() => void handleSend()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition disabled:opacity-30 active:scale-95"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>

                {/* Quick Attach Chips */}
                <div className="mt-1.5 flex gap-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTab('post')
                      setAttachmentPickerOpen(true)
                    }}
                    className="rounded-full bg-white/50 px-2.5 py-1 text-[10px] font-extrabold text-ink-soft hover:text-ink"
                  >
                    💬 Attach Post
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTab('prompt')
                      setAttachmentPickerOpen(true)
                    }}
                    className="rounded-full bg-white/50 px-2.5 py-1 text-[10px] font-extrabold text-ink-soft hover:text-ink"
                  >
                    🎨 Attach Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTab('project')
                      setAttachmentPickerOpen(true)
                    }}
                    className="rounded-full bg-white/50 px-2.5 py-1 text-[10px] font-extrabold text-ink-soft hover:text-ink"
                  >
                    📁 Attach Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            MODAL 1: ATTACHMENT PICKER DRAWER
            ═════════════════════════════════════════════════════════════════ */}
        {attachmentPickerOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/40 p-3"
            onClick={() => setAttachmentPickerOpen(false)}
          >
            <div
              className="pg-glass-strong mx-auto max-h-[85dvh] w-full max-w-[440px] overflow-hidden rounded-[26px] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="pg-title text-base text-ink">Attach to Message</h3>
                <button
                  type="button"
                  onClick={() => setAttachmentPickerOpen(false)}
                  className="text-xs font-black text-ink-soft hover:text-ink"
                >
                  ✕
                </button>
              </div>

              {/* Tabs: Posts, Prompts, Projects */}
              <div className="mt-3 flex gap-1 rounded-full bg-black/5 p-1">
                {(['post', 'prompt', 'project'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPickerTab(t)}
                    className={cn(
                      'flex-1 rounded-full py-1.5 text-xs font-extrabold capitalize transition',
                      pickerTab === t ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
                    )}
                  >
                    {t}s
                  </button>
                ))}
              </div>

              <div className="mt-2.5">
                <Input
                  placeholder={`Search ${pickerTab}s…`}
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full text-xs py-1.5"
                />
              </div>

              {/* Items List */}
              <div className="pg-scroll mt-3 max-h-60 space-y-1.5 overflow-y-auto pr-1">
                {pickerTab === 'post' ? (
                  (posts.data ?? [])
                    .filter((p) =>
                      pickerSearch ? (p.title ?? '').toLowerCase().includes(pickerSearch.toLowerCase()) : true,
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedAttachment({
                            itemType: 'post',
                            itemId: p.id,
                            title: p.title || 'Untitled post',
                            subtitle: p.content_text?.slice(0, 60),
                          })
                          setAttachmentPickerOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-[14px] bg-white/60 p-2.5 text-left text-xs font-bold text-ink transition hover:bg-white active:scale-[0.99]"
                      >
                        <span className="truncate pr-2">{p.title || 'Untitled post'}</span>
                        <span className="shrink-0 text-[10px] font-extrabold text-ink-soft">Attach +</span>
                      </button>
                    ))
                ) : null}

                {pickerTab === 'prompt' ? (
                  (prompts.data?.prompts ?? [])
                    .filter((p) =>
                      pickerSearch ? p.name.toLowerCase().includes(pickerSearch.toLowerCase()) : true,
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedAttachment({
                            itemType: 'prompt',
                            itemId: p.id,
                            title: p.name,
                            subtitle: p.prompt.slice(0, 60),
                          })
                          setAttachmentPickerOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-[14px] bg-white/60 p-2.5 text-left text-xs font-bold text-ink transition hover:bg-white active:scale-[0.99]"
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        <span className="shrink-0 text-[10px] font-extrabold text-ink-soft">Attach +</span>
                      </button>
                    ))
                ) : null}

                {pickerTab === 'project' ? (
                  (projects.data ?? [])
                    .filter((p) =>
                      pickerSearch ? p.name.toLowerCase().includes(pickerSearch.toLowerCase()) : true,
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedAttachment({
                            itemType: 'project',
                            itemId: p.id,
                            title: p.name,
                            subtitle: p.description ?? undefined,
                          })
                          setAttachmentPickerOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-[14px] bg-white/60 p-2.5 text-left text-xs font-bold text-ink transition hover:bg-white active:scale-[0.99]"
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        <span className="shrink-0 text-[10px] font-extrabold text-ink-soft">Attach +</span>
                      </button>
                    ))
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* ═════════════════════════════════════════════════════════════════
            MODAL 2: NEW CHAT / COLLABORATOR MODAL
            ═════════════════════════════════════════════════════════════════ */}
        {newChatOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setNewChatOpen(false)}
          >
            <div
              className="pg-glass-strong w-full max-w-[380px] rounded-[26px] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="pg-title text-base text-ink">New Chat</h3>
              <p className="mt-1 text-xs font-semibold text-ink-soft">
                Enter a collaborator's PostGen email to start chatting and sharing items.
              </p>

              <div className="mt-3">
                <Input
                  type="email"
                  placeholder="collaborator@example.com"
                  value={newChatEmail}
                  onChange={(e) => setNewChatEmail(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              {/* Recent Recipients Chips */}
              <div className="mt-3">
                <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">
                  Recent contacts:
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {getRecentRecipients().map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => setNewChatEmail(email)}
                      className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold text-ink hover:bg-white"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1 py-2 text-xs font-extrabold"
                  disabled={!newChatEmail.trim() || !newChatEmail.includes('@')}
                  onClick={() => {
                    const clean = newChatEmail.trim().toLowerCase()
                    setActiveContactEmail(clean)
                    setNewChatOpen(false)
                    setNewChatEmail('')
                  }}
                >
                  Start Chat →
                </Button>
                <Button
                  variant="ghost"
                  className="py-2 text-xs"
                  onClick={() => setNewChatOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <TabBar active="inbox" />
    </main>
  )
}
