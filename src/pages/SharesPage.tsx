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
import {
  clearChatConversation,
  deleteChatMessage,
  loadChatMessages,
  loadPinnedChats,
  loadShareReactions,
  sendChatMessage,
  toggleMessageReaction,
  togglePinnedChat,
  toggleShareReaction,
  type ChatMessage,
  type ChatReplyPreview,
} from '../lib/chat'
import TabBar from '../components/TabBar'
import { cn } from '../lib/cn'

const ITEM_ICON: Record<ShareItemType, string> = { project: '📁', post: '💬', prompt: '🎨' }
const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '🔥', '🚀', '💡']
const QUICK_REPLIES = [
  'Looks amazing! 🔥',
  'Approved for publishing! ✅',
  'Could you make a quick tweak? ✍️',
  'Working on the visuals now! 🎨',
  'Let’s sync up on this soon! 🤝',
]

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatDayHeader(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    if (isToday) return 'Today'
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    if (isYesterday) return 'Yesterday'
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return 'Recent'
  }
}

function getAvatarGradient(key: string): string {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-600',
    'from-cyan-400 to-blue-500',
  ]
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 1200
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          } else {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function excerpt(share: Share): string {
  if (share.item_type === 'post') {
    const p = share.payload as unknown as SharePostPayload
    return p.tweets?.[0]?.slice(0, 140) ?? p.title
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
  if (share.item_type === 'post' && r.postId) {
    const p = r.projectId ? `?project=${String(r.projectId)}` : ''
    return `/posts/${String(r.postId)}${p}`
  }
  if (share.item_type === 'prompt') return '/prompts'
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

/**
 * Avatar with optional live online status dot
 */
function CollaboratorAvatar({
  nameOrEmail,
  size = 'md',
  showOnline = true,
}: {
  nameOrEmail: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showOnline?: boolean
}) {
  const initial = (nameOrEmail.trim()[0] || 'U').toUpperCase()
  const gradient = getAvatarGradient(nameOrEmail)

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs font-bold',
    md: 'h-10 w-10 text-sm font-extrabold',
    lg: 'h-12 w-12 text-base font-extrabold',
    xl: 'h-16 w-16 text-xl font-black',
  }[size]

  const dotClasses = {
    sm: 'h-2 w-2 bottom-0 right-0 ring-1',
    md: 'h-3 w-3 bottom-0 right-0 ring-2',
    lg: 'h-3.5 w-3.5 bottom-0.5 right-0.5 ring-2',
    xl: 'h-4 w-4 bottom-1 right-1 ring-2',
  }[size]

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-tr text-white shadow-sm ring-1 ring-black/5 select-none',
          sizeClasses,
          gradient,
        )}
      >
        {initial}
      </div>
      {showOnline ? (
        <span
          className={cn(
            'absolute rounded-full bg-emerald-500 ring-white',
            dotClasses,
          )}
          title="Active now"
        />
      ) : null}
    </div>
  )
}

/**
 * Rich Interactive Card for Shared Post / Prompt / Project
 */
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
  reactions = {},
  myEmail,
  onToggleReaction,
  onReply,
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
  reactions?: Record<string, string[]>
  myEmail: string
  onToggleReaction: (emoji: string) => void
  onReply: () => void
}) {
  const [showToolbar, setShowToolbar] = useState(false)
  const isPending = share.status === 'pending'
  const postPayload = share.item_type === 'post' ? (share.payload as unknown as SharePostPayload) : null
  const promptPayload = share.item_type === 'prompt' ? (share.payload as unknown as SharePromptPayload) : null

  return (
    <div
      className="group relative my-1"
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {/* Floating Toolbar on Hover */}
      {showToolbar ? (
        <div
          className={cn(
            'absolute -top-8 z-20 flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-1 shadow-lg ring-1 ring-black/10 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100',
            isMe ? 'right-0' : 'left-0',
          )}
        >
          {REACTION_EMOJIS.slice(0, 5).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggleReaction(emoji)}
              className="p-1 text-sm transition hover:scale-130 active:scale-110"
            >
              {emoji}
            </button>
          ))}
          <div className="mx-1 h-3.5 w-px bg-black/10" />
          <button
            type="button"
            onClick={onReply}
            title="Reply"
            className="p-1 text-xs text-ink-soft hover:text-ink hover:scale-110"
          >
            ↩️
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          'overflow-hidden rounded-[22px] border text-left shadow-sm transition',
          isMe
            ? 'border-blue-400/30 bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
            : 'border-black/5 bg-white/95 text-ink',
        )}
      >
        {/* Card Header Tag */}
        <div
          className={cn(
            'flex items-center justify-between border-b px-4 py-2.5',
            isMe ? 'border-white/15 bg-white/10' : 'border-black/5 bg-black/[0.02]',
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{ITEM_ICON[share.item_type]}</span>
            <span
              className={cn(
                'text-[11px] font-black tracking-wider uppercase',
                isMe ? 'text-white/90' : 'text-ink-soft',
              )}
            >
              Shared {SHARE_ITEM_LABEL[share.item_type]}
            </span>
          </div>

          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
              share.status === 'accepted'
                ? isMe
                  ? 'bg-emerald-400 text-emerald-950 font-black'
                  : 'bg-emerald-100 text-emerald-800'
                : share.status === 'declined'
                  ? isMe
                    ? 'bg-rose-400 text-rose-950 font-black'
                    : 'bg-rose-100 text-rose-800'
                  : isMe
                    ? 'bg-amber-300 text-amber-950 font-black'
                    : 'bg-amber-100 text-amber-800',
            )}
          >
            {share.status}
          </span>
        </div>

        {/* Card Content Body */}
        <div className="p-4 space-y-2.5">
          {share.message ? (
            <p
              className={cn(
                'text-xs font-semibold leading-relaxed italic border-l-2 pl-2.5 my-1',
                isMe ? 'border-white/40 text-white/90' : 'border-blue-500 text-ink',
              )}
            >
              "{share.message}"
            </p>
          ) : null}

          <div>
            <h4 className="text-sm font-black leading-snug">{share.title}</h4>
            <p className={cn('mt-1 text-xs leading-relaxed line-clamp-3', isMe ? 'text-white/80' : 'text-ink-soft')}>
              {excerpt(share)}
            </p>
          </div>

          {/* Twitter / Post Preview Box */}
          {postPayload && postPayload.tweets && postPayload.tweets.length > 0 ? (
            <div
              className={cn(
                'rounded-xl p-3 text-xs',
                isMe ? 'bg-black/20 text-white ring-1 ring-white/10' : 'bg-black/5 text-ink ring-1 ring-black/5',
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase opacity-75 mb-1">
                <span>𝕏 Tweet preview</span>
                <span>•</span>
                <span>{postPayload.tweets.length} {postPayload.tweets.length === 1 ? 'tweet' : 'tweets'}</span>
              </div>
              <p className="font-mono text-[11px] leading-relaxed line-clamp-2">
                {postPayload.tweets[0]}
              </p>
            </div>
          ) : null}

          {/* Prompt Code snippet */}
          {promptPayload && promptPayload.prompt ? (
            <div
              className={cn(
                'rounded-xl p-2.5 font-mono text-[11px] leading-relaxed line-clamp-2',
                isMe ? 'bg-black/20 text-white/90 ring-1 ring-white/10' : 'bg-black/5 text-ink ring-1 ring-black/5',
              )}
            >
              {promptPayload.prompt}
            </div>
          ) : null}

          {/* Action Row for Received Pending Shares */}
          {!isMe && isPending ? (
            <div className="mt-3 pt-3 border-t border-black/8 space-y-2">
              {share.item_type === 'post' ? (
                <div>
                  <label className="block text-[10px] font-extrabold text-ink-soft uppercase tracking-wide mb-1">
                    Select Destination Project:
                  </label>
                  <Select
                    value={destinationProjectId ?? ''}
                    onChange={(e) => onDestinationChange(e.target.value)}
                    className="w-full text-xs py-1.5 font-bold"
                  >
                    <option value="">Choose project…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="accent"
                  className="flex-1 py-2 text-xs font-black shadow-sm"
                  disabled={acceptPending}
                  onClick={() => onAccept(share)}
                >
                  {acceptPending ? 'Importing…' : '✓ Accept & Import'}
                </Button>
                <Button
                  variant="ghost"
                  className="py-2 text-xs font-bold text-ink-soft hover:text-rose-600"
                  disabled={respondPending}
                  onClick={() => onDecline(share)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ) : null}

          {/* Open Link for Accepted Shares */}
          {share.status === 'accepted' && openLink(share) ? (
            <div className="pt-2 border-t border-black/5">
              <Link
                to={openLink(share)!}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-extrabold transition hover:underline',
                  isMe ? 'text-white' : 'text-blue-600',
                )}
              >
                <span>Open in PostGen</span>
                <span>→</span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reaction Badges */}
      {Object.entries(reactions).length > 0 ? (
        <div className={cn('flex flex-wrap gap-1 mt-1 px-1', isMe ? 'justify-end' : 'justify-start')}>
          {Object.entries(reactions).map(([emoji, users]) => {
            if (users.length === 0) return null
            const hasReacted = users.includes(myEmail)
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(emoji)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold shadow-xs transition active:scale-95',
                  hasReacted
                    ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400'
                    : 'bg-white text-ink ring-1 ring-black/10 hover:bg-black/5',
                )}
                title={users.join(', ')}
              >
                <span>{emoji}</span>
                <span className="text-[10px]">{users.length}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Standard Messenger Chat Bubble (Text, Images, Reactions, Replies)
 */
function MessengerMessageBubble({
  message,
  isMe,
  isFirstInGroup,
  isLastInGroup,
  myEmail,
  onToggleReaction,
  onReply,
  onCopy,
  onDelete,
  onImageClick,
}: {
  message: ChatMessage
  isMe: boolean
  isFirstInGroup: boolean
  isLastInGroup: boolean
  myEmail: string
  onToggleReaction: (emoji: string) => void
  onReply: () => void
  onCopy: () => void
  onDelete: () => void
  onImageClick: (url: string) => void
}) {
  const [showToolbar, setShowToolbar] = useState(false)
  const isThumbsUpOnly = message.text.trim() === '👍'
  const isEmojiOnly =
    message.text.trim().length <= 4 &&
    REACTION_EMOJIS.includes(message.text.trim())

  // Dynamic corner rounding for Messenger-style group bubbles
  const cornerRounding = isMe
    ? cn(
        'rounded-2xl',
        !isFirstInGroup && 'rounded-tr-md',
        !isLastInGroup && 'rounded-br-md',
      )
    : cn(
        'rounded-2xl',
        !isFirstInGroup && 'rounded-tl-md',
        !isLastInGroup && 'rounded-bl-md',
      )

  return (
    <div
      className={cn(
        'group relative my-0.5 flex flex-col',
        isMe ? 'items-end' : 'items-start',
      )}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {/* Floating Toolbar on Hover */}
      {showToolbar ? (
        <div
          className={cn(
            'absolute -top-8 z-20 flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-1 shadow-lg ring-1 ring-black/10 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100',
            isMe ? 'right-0' : 'left-0',
          )}
        >
          {REACTION_EMOJIS.slice(0, 5).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggleReaction(emoji)}
              className="p-1 text-sm transition hover:scale-130 active:scale-110"
            >
              {emoji}
            </button>
          ))}
          <div className="mx-1 h-3.5 w-px bg-black/10" />
          <button
            type="button"
            onClick={onReply}
            title="Reply"
            className="p-1 text-xs text-ink-soft hover:text-ink hover:scale-110"
          >
            ↩️
          </button>
          <button
            type="button"
            onClick={onCopy}
            title="Copy text"
            className="p-1 text-xs text-ink-soft hover:text-ink hover:scale-110"
          >
            📋
          </button>
          {isMe ? (
            <button
              type="button"
              onClick={onDelete}
              title="Delete message"
              className="p-1 text-xs text-rose-500 hover:text-rose-700 hover:scale-110"
            >
              🗑️
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Quoted Reply Banner inside Bubble */}
      {message.replyTo ? (
        <div
          className={cn(
            'mb-1 flex max-w-[280px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold opacity-80',
            isMe
              ? 'bg-blue-800/40 text-white self-end'
              : 'bg-black/5 text-ink self-start',
          )}
        >
          <span className="text-[10px]">↳</span>
          <span className="font-extrabold">{message.replyTo.sender}:</span>
          <span className="truncate italic font-normal">"{message.replyTo.snippet}"</span>
        </div>
      ) : null}

      {/* Image attachment if any */}
      {message.imageUrl ? (
        <button
          type="button"
          onClick={() => onImageClick(message.imageUrl!)}
          className="mb-1 block max-w-[280px] overflow-hidden rounded-2xl shadow-sm transition hover:opacity-95"
        >
          <img
            src={message.imageUrl}
            alt="chat media"
            className="h-auto max-h-64 w-full object-cover"
          />
        </button>
      ) : null}

      {/* Text Bubble or Big Emoji */}
      {isThumbsUpOnly || isEmojiOnly ? (
        <div className="py-1 px-2 select-none animate-in zoom-in-90 duration-150">
          <span className="text-4xl filter drop-shadow-sm">{message.text}</span>
        </div>
      ) : message.text ? (
        <div
          className={cn(
            'max-w-[300px] px-3.5 py-2 text-sm leading-relaxed font-semibold shadow-xs transition sm:max-w-[340px]',
            cornerRounding,
            isMe
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white'
              : 'bg-white/95 text-ink ring-1 ring-black/5',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      ) : null}

      {/* Delivery Receipt / Timestamp info */}
      <div
        className={cn(
          'flex items-center gap-1 px-1 text-[10px] font-bold text-ink-soft opacity-60 mt-0.5',
          isMe ? 'justify-end' : 'justify-start',
        )}
      >
        <span>{formatMessageTime(message.createdAt)}</span>
        {isMe ? <span title="Delivered">✓✓</span> : null}
      </div>

      {/* Reactions Bar under bubble */}
      {message.reactions && Object.keys(message.reactions).length > 0 ? (
        <div className={cn('flex flex-wrap gap-1 mt-0.5 px-1', isMe ? 'justify-end' : 'justify-start')}>
          {Object.entries(message.reactions).map(([emoji, users]) => {
            if (users.length === 0) return null
            const hasReacted = users.includes(myEmail)
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(emoji)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold shadow-xs transition active:scale-95',
                  hasReacted
                    ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400'
                    : 'bg-white text-ink ring-1 ring-black/10 hover:bg-black/5',
                )}
                title={users.join(', ')}
              >
                <span>{emoji}</span>
                <span className="text-[10px]">{users.length}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Messenger Call Simulation Modal (Voice / Video)
 */
function CallSimulationModal({
  contactEmail,
  displayName,
  type = 'voice',
  onClose,
}: {
  contactEmail: string
  displayName: string
  type: 'voice' | 'video'
  onClose: () => void
}) {
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setCallDuration((d) => d + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-sm flex-col items-center justify-between rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-black p-8 text-white shadow-2xl min-h-[460px]">
        {/* Call Info Header */}
        <div className="text-center space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            PostGen {type === 'voice' ? 'Encrypted Audio' : 'Video'} Call
          </span>
          <h3 className="text-2xl font-black mt-2">{displayName}</h3>
          <p className="text-xs font-semibold text-white/60">{contactEmail}</p>
          <p className="text-sm font-mono font-bold text-white/80 pt-1">
            {callDuration < 3 ? 'Ringing…' : formatTimer(callDuration)}
          </p>
        </div>

        {/* Center Pulsing Avatar */}
        <div className="relative my-8">
          <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-blue-500/30" />
          <CollaboratorAvatar nameOrEmail={contactEmail} size="xl" showOnline={false} />
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-lg transition active:scale-90',
              isMuted ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30',
            )}
            title="Mute microphone"
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-2xl text-white shadow-xl transition hover:bg-rose-700 active:scale-95"
            title="End call"
          >
            📞
          </button>

          <button
            type="button"
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-lg transition active:scale-90',
              isSpeaker ? 'bg-blue-600 text-white' : 'bg-white/20 text-white hover:bg-white/30',
            )}
            title="Speaker"
          >
            🔊
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Collaborator Info & Shared Media Drawer
 */
function CollaboratorDetailsSheet({
  contactEmail,
  displayName,
  shares,
  isPinned,
  onTogglePin,
  onClearHistory,
  onClose,
}: {
  contactEmail: string
  displayName: string
  shares: Share[]
  isPinned: boolean
  onTogglePin: () => void
  onClearHistory: () => void
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'posts' | 'prompts' | 'projects'>('posts')

  const posts = shares.filter((s) => s.item_type === 'post')
  const prompts = shares.filter((s) => s.item_type === 'prompt')
  const projects = shares.filter((s) => s.item_type === 'project')

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs p-0 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-sm flex-col bg-white p-5 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <h3 className="text-base font-black text-ink">Conversation Info</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink hover:bg-black/10"
          >
            ✕
          </button>
        </div>

        {/* Profile Card */}
        <div className="flex flex-col items-center py-6 text-center">
          <CollaboratorAvatar nameOrEmail={contactEmail} size="xl" />
          <h4 className="mt-3 text-lg font-black text-ink">{displayName}</h4>
          <p className="text-xs font-semibold text-ink-soft">{contactEmail}</p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onTogglePin}
              className={cn(
                'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold transition',
                isPinned ? 'bg-amber-100 text-amber-900' : 'bg-black/5 text-ink hover:bg-black/10',
              )}
            >
              <span>{isPinned ? '★ Pinned' : '☆ Pin Chat'}</span>
            </button>
          </div>
        </div>

        {/* Shared Media Tabs */}
        <div className="mt-2 border-t border-black/5 pt-4">
          <p className="text-xs font-black uppercase tracking-wider text-ink-soft mb-2.5">
            Shared in this chat
          </p>
          <div className="flex gap-1 rounded-full bg-black/5 p-1 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={cn(
                'flex-1 rounded-full py-1.5 text-xs font-extrabold capitalize transition',
                activeTab === 'posts' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft',
              )}
            >
              Posts ({posts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('prompts')}
              className={cn(
                'flex-1 rounded-full py-1.5 text-xs font-extrabold capitalize transition',
                activeTab === 'prompts' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft',
              )}
            >
              Prompts ({prompts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={cn(
                'flex-1 rounded-full py-1.5 text-xs font-extrabold capitalize transition',
                activeTab === 'projects' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft',
              )}
            >
              Projects ({projects.length})
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {activeTab === 'posts' ? (
              posts.length === 0 ? (
                <p className="text-xs font-semibold text-ink-soft text-center py-4">No shared posts yet</p>
              ) : (
                posts.map((s) => (
                  <div key={s.id} className="rounded-xl bg-black/[0.03] p-2.5 text-xs">
                    <p className="font-extrabold text-ink truncate">{s.title}</p>
                    <p className="text-[11px] text-ink-soft truncate">{excerpt(s)}</p>
                  </div>
                ))
              )
            ) : null}

            {activeTab === 'prompts' ? (
              prompts.length === 0 ? (
                <p className="text-xs font-semibold text-ink-soft text-center py-4">No shared prompts yet</p>
              ) : (
                prompts.map((s) => (
                  <div key={s.id} className="rounded-xl bg-black/[0.03] p-2.5 text-xs">
                    <p className="font-extrabold text-ink truncate">{s.title}</p>
                    <p className="text-[11px] text-ink-soft truncate">{excerpt(s)}</p>
                  </div>
                ))
              )
            ) : null}

            {activeTab === 'projects' ? (
              projects.length === 0 ? (
                <p className="text-xs font-semibold text-ink-soft text-center py-4">No shared projects yet</p>
              ) : (
                projects.map((s) => (
                  <div key={s.id} className="rounded-xl bg-black/[0.03] p-2.5 text-xs">
                    <p className="font-extrabold text-ink truncate">{s.title}</p>
                    <p className="text-[11px] text-ink-soft truncate">{excerpt(s)}</p>
                  </div>
                ))
              )
            ) : null}
          </div>
        </div>

        {/* Clear Chat Option */}
        <div className="mt-auto border-t border-black/5 pt-4">
          <Button
            variant="ghost"
            onClick={onClearHistory}
            className="w-full text-xs font-extrabold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            Clear Conversation History
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Image Lightbox Modal
 */
function ImageLightboxModal({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt="expanded preview"
          className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-4 -right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink font-bold shadow-xl hover:bg-black/10"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * Messenger Chat Master Page
 */
export default function SharesPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

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
  const [chatsFilter, setChatsFilter] = useState<'all' | 'unread' | 'posts' | 'prompts'>('all')

  // Chat Composer State
  const [textDraft, setTextDraft] = useState('')
  const [stagedImage, setStagedImage] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatReplyPreview | null>(null)
  const [selectedAttachment, setSelectedAttachment] = useState<{
    itemType: ShareItemType
    itemId: string
    title: string
    subtitle?: string
  } | null>(null)

  // Drawers & Modals
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<ShareItemType>('post')
  const [pickerSearch, setPickerSearch] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newChatEmail, setNewChatEmail] = useState('')
  const [destinations, setDestinations] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [emojiDrawerOpen, setEmojiDrawerOpen] = useState(false)
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false)
  const [callingState, setCallingState] = useState<{ type: 'voice' | 'video' } | null>(null)
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false)
  const [inChatSearchQuery, setInChatSearchQuery] = useState('')

  // Storage states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(loadChatMessages)
  const [shareReactions, setShareReactions] = useState<Record<string, Record<string, string[]>>>(loadShareReactions)
  const [pinnedChats, setPinnedChats] = useState<string[]>(loadPinnedChats)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Listen to local storage events for instant real-time sync
  useEffect(() => {
    const refreshChat = () => setChatMessages(loadChatMessages())
    const refreshReactions = () => setShareReactions(loadShareReactions())
    const refreshPinned = () => setPinnedChats(loadPinnedChats())

    window.addEventListener('postgen_chat_messages_updated', refreshChat)
    window.addEventListener('postgen_share_reactions_updated', refreshReactions)
    window.addEventListener('postgen_pinned_chats_updated', refreshPinned)
    window.addEventListener('storage', refreshChat)

    return () => {
      window.removeEventListener('postgen_chat_messages_updated', refreshChat)
      window.removeEventListener('postgen_share_reactions_updated', refreshReactions)
      window.removeEventListener('postgen_pinned_chats_updated', refreshPinned)
      window.removeEventListener('storage', refreshChat)
    }
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (activeContactEmail) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeContactEmail, received.data, sent.data, chatMessages.length, stagedImage])

  // Sync URL search params
  const selectContact = (email: string | null) => {
    setActiveContactEmail(email)
    if (email) {
      setSearchParams({ with: email })
    } else {
      setSearchParams({})
    }
  }

  const receivedList = useMemo(() => received.data ?? [], [received.data])
  const sentList = useMemo(() => sent.data ?? [], [sent.data])
  const myEmail = user?.email?.toLowerCase() ?? ''

  // Build aggregated conversations
  const conversations = useMemo(() => {
    type ContactData = {
      email: string
      displayName: string
      shares: Share[]
      messages: ChatMessage[]
      pendingCount: number
      latestTimestamp: string
      latestSnippet: string
      isPinned: boolean
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
          isPinned: pinnedChats.includes(key),
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
        c.latestSnippet = `You: ${sh.message || `Sent ${SHARE_ITEM_LABEL[sh.item_type]}: ${sh.title}`}`
      }
    }

    // Add chat messages
    for (const msg of chatMessages) {
      const otherEmail = msg.senderEmail === myEmail ? msg.recipientEmail : msg.senderEmail
      if (!otherEmail || otherEmail === myEmail) continue
      const c = ensureContact(otherEmail)
      c.messages.push(msg)
      if (!c.latestTimestamp || msg.createdAt > c.latestTimestamp) {
        c.latestTimestamp = msg.createdAt
        c.latestSnippet = msg.senderEmail === myEmail ? `You: ${msg.text || '📷 Photo'}` : msg.text || '📷 Photo'
      }
    }

    // Add recent recipients even if no messages yet
    for (const email of getRecentRecipients()) {
      if (email.toLowerCase() !== myEmail) {
        ensureContact(email)
      }
    }

    const list = Array.from(map.values())
    // Pinned first, then sorted by latest timestamp
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.latestTimestamp.localeCompare(a.latestTimestamp)
    })
    return list
  }, [receivedList, sentList, chatMessages, myEmail, pinnedChats])

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let list = conversations
    if (chatsFilter === 'unread') {
      list = list.filter((c) => c.pendingCount > 0)
    } else if (chatsFilter === 'posts') {
      list = list.filter((c) => c.shares.some((s) => s.item_type === 'post'))
    } else if (chatsFilter === 'prompts') {
      list = list.filter((c) => c.shares.some((s) => s.item_type === 'prompt' || s.item_type === 'project'))
    }

    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.latestSnippet.toLowerCase().includes(q),
    )
  }, [conversations, searchQuery, chatsFilter])

  // Current active conversation's merged message thread
  const activeThread = useMemo((): ChatThreadItem[] => {
    if (!activeContactEmail) return []
    const cleanEmail = activeContactEmail.toLowerCase()
    const items: ChatThreadItem[] = []

    // Received shares
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

    // Sent shares
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

  // Filtered thread items for in-chat search
  const visibleThreadItems = useMemo(() => {
    if (!inChatSearchQuery.trim()) return activeThread
    const q = inChatSearchQuery.toLowerCase()
    return activeThread.filter((item) => {
      if (item.kind === 'message') return item.message?.text.toLowerCase().includes(q)
      if (item.kind === 'share') {
        return (
          item.share?.title.toLowerCase().includes(q) ||
          item.share?.message?.toLowerCase().includes(q)
        )
      }
      return false
    })
  }, [activeThread, inChatSearchQuery])

  const activeContact = conversations.find((c) => c.email === activeContactEmail)

  // Handle Photo Picker Selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file)
      setStagedImage(dataUrl)
      setPlusMenuOpen(false)
    } catch {
      setActionError('Could not process image')
    }
  }

  // Handle Send action (text, attachment, photo)
  const handleSend = async (overrideText?: string) => {
    if (!activeContactEmail) return
    setActionError(null)

    const textToSend = (overrideText ?? textDraft).trim()
    if (!textToSend && !selectedAttachment && !stagedImage) return

    try {
      if (selectedAttachment) {
        // Real PostGen Share
        await send.mutateAsync({
          items: [selectedAttachment],
          recipientEmail: activeContactEmail,
          message: textToSend,
        })
      } else {
        // Chat Message
        sendChatMessage({
          senderEmail: myEmail,
          recipientEmail: activeContactEmail,
          text: textToSend,
          imageUrl: stagedImage ?? undefined,
          replyTo: replyingTo ?? undefined,
        })
      }

      rememberRecipient(activeContactEmail)
      setTextDraft('')
      setStagedImage(null)
      setReplyingTo(null)
      setSelectedAttachment(null)
      setPlusMenuOpen(false)
      setEmojiDrawerOpen(false)
      setQuickRepliesOpen(false)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to send')
    }
  }

  // Messenger Thumbs Up 👍
  const handleSendThumbsUp = () => {
    void handleSend('👍')
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

  // Copy text to clipboard
  const handleCopyText = (text: string) => {
    void navigator.clipboard.writeText(text)
  }

  return (
    <main className="pg-shell min-h-dvh flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 1: ACTIVE CHAT CONVERSATION (Messenger Interface)
          ═══════════════════════════════════════════════════════════════════ */}
      {activeContactEmail ? (
        <div className="flex flex-col flex-1 h-dvh max-w-[500px] w-full mx-auto bg-slate-50/70 border-x border-black/5 shadow-2xl">
          {/* Top Messenger App Bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-white/95 px-3 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => selectContact(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-black/5 active:scale-95"
                title="Back to Chats"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setDetailsSheetOpen(true)}
                className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition"
              >
                <CollaboratorAvatar nameOrEmail={activeContactEmail} size="md" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-ink leading-tight">
                    {activeContact?.displayName || activeContactEmail.split('@')[0]}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active now</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Header Action Buttons (Messenger Call, Search, Info) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInChatSearchOpen(!inChatSearchOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-black/5 hover:text-ink active:scale-95"
                title="Search in conversation"
              >
                🔍
              </button>

              <button
                type="button"
                onClick={() => setCallingState({ type: 'voice' })}
                className="flex h-9 w-9 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 active:scale-95"
                title="Audio Call"
              >
                📞
              </button>

              <button
                type="button"
                onClick={() => setCallingState({ type: 'video' })}
                className="flex h-9 w-9 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 active:scale-95"
                title="Video Call"
              >
                📹
              </button>

              <button
                type="button"
                onClick={() => setDetailsSheetOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-black/5 hover:text-ink active:scale-95"
                title="Conversation info"
              >
                ℹ️
              </button>
            </div>
          </header>

          {/* Inline In-Chat Search Bar */}
          {inChatSearchOpen ? (
            <div className="flex items-center gap-2 border-b border-black/5 bg-white px-3 py-2 animate-in slide-in-from-top duration-150">
              <Input
                placeholder="Search messages in this chat…"
                value={inChatSearchQuery}
                onChange={(e) => setInChatSearchQuery(e.target.value)}
                className="flex-1 text-xs py-1"
                autoFocus
              />
              <span className="text-xs font-bold text-ink-soft">
                {visibleThreadItems.length} found
              </span>
              <button
                type="button"
                onClick={() => {
                  setInChatSearchOpen(false)
                  setInChatSearchQuery('')
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-black/5"
              >
                ✕
              </button>
            </div>
          ) : null}

          {/* Action Error Banner if any */}
          {actionError ? (
            <div className="px-4 pt-2">
              <ErrorBox message={actionError} />
            </div>
          ) : null}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {visibleThreadItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CollaboratorAvatar nameOrEmail={activeContactEmail} size="xl" />
                <h4 className="mt-3 text-base font-black text-ink">
                  {activeContact?.displayName || activeContactEmail.split('@')[0]}
                </h4>
                <p className="mt-1 text-xs font-semibold text-ink-soft max-w-[240px]">
                  Send a message, draft, prompt, or project to start collaborating.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSend('Wave 👋')}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-ink shadow-xs ring-1 ring-black/10 hover:bg-black/5 active:scale-95"
                  >
                    Say Hello 👋
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTab('post')
                      setAttachmentPickerOpen(true)
                    }}
                    className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 active:scale-95"
                  >
                    💬 Share Post
                  </button>
                </div>
              </div>
            ) : null}

            {visibleThreadItems.map((item, idx) => {
              const prev = visibleThreadItems[idx - 1]
              const next = visibleThreadItems[idx + 1]

              const isFirstInGroup = !prev || prev.isMe !== item.isMe
              const isLastInGroup = !next || next.isMe !== item.isMe

              // Check if date divider is needed
              const showDateHeader =
                !prev ||
                new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString()

              return (
                <div key={item.id} className="space-y-1">
                  {/* Date Header Divider */}
                  {showDateHeader ? (
                    <div className="my-4 flex items-center justify-center">
                      <span className="rounded-full bg-black/5 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink-soft select-none">
                        {formatDayHeader(item.createdAt)}
                      </span>
                    </div>
                  ) : null}

                  {/* Message Bubble or Share Card */}
                  <div
                    className={cn(
                      'flex gap-2 items-end',
                      item.isMe ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {/* Collaborator Avatar on Received Bubble */}
                    {!item.isMe ? (
                      <div className="w-7 shrink-0">
                        {isLastInGroup ? (
                          <CollaboratorAvatar nameOrEmail={activeContactEmail} size="sm" showOnline={false} />
                        ) : null}
                      </div>
                    ) : null}

                    {/* Shared Item Card */}
                    {item.kind === 'share' && item.share ? (
                      <div className="max-w-[320px] sm:max-w-[360px]">
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
                          reactions={shareReactions[item.share.id]}
                          myEmail={myEmail}
                          onToggleReaction={(emoji) => toggleShareReaction(item.share!.id, emoji, myEmail)}
                          onReply={() =>
                            setReplyingTo({
                              id: item.share!.id,
                              sender: item.isMe ? 'You' : activeContact?.displayName || 'Collaborator',
                              snippet: `Shared ${item.share!.title}`,
                            })
                          }
                        />
                      </div>
                    ) : null}

                    {/* Standard Text or Photo Message Bubble */}
                    {item.kind === 'message' && item.message ? (
                      <MessengerMessageBubble
                        message={item.message}
                        isMe={item.isMe}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        myEmail={myEmail}
                        onToggleReaction={(emoji) => toggleMessageReaction(item.message!.id, emoji, myEmail)}
                        onReply={() =>
                          setReplyingTo({
                            id: item.message!.id,
                            sender: item.isMe ? 'You' : activeContact?.displayName || 'Collaborator',
                            snippet: item.message!.text || 'Photo',
                          })
                        }
                        onCopy={() => handleCopyText(item.message!.text)}
                        onDelete={() => deleteChatMessage(item.message!.id)}
                        onImageClick={(url) => setLightboxUrl(url)}
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              MESSENGER COMPOSER
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky bottom-0 z-20 border-t border-black/8 bg-white/95 backdrop-blur-md p-2.5">
            {/* Quick Replies Shelf */}
            {quickRepliesOpen ? (
              <div className="mb-2 flex flex-wrap gap-1.5 animate-in slide-in-from-bottom-2 duration-100">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      void handleSend(q)
                      setQuickRepliesOpen(false)
                    }}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Emoji Tray Shelf */}
            {emojiDrawerOpen ? (
              <div className="mb-2 flex items-center gap-2 rounded-2xl bg-black/5 p-2 animate-in slide-in-from-bottom-2 duration-100">
                {['❤️', '🔥', '👍', '😂', '🚀', '✨', '👏', '💡', '💯', '🙌', '🎉', '⚡'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setTextDraft((t) => t + emoji)
                    }}
                    className="text-xl transition hover:scale-130 active:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Replying-To Banner */}
            {replyingTo ? (
              <div className="mb-2 flex items-center justify-between rounded-xl bg-black/5 px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-extrabold text-ink">Replying to {replyingTo.sender}:</span>
                  <span className="truncate italic text-ink-soft">"{replyingTo.snippet}"</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="font-bold text-ink-soft hover:text-ink px-1"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Staged Attachment Preview Chip */}
            {selectedAttachment ? (
              <div className="mb-2 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-1.5 text-xs ring-1 ring-blue-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{ITEM_ICON[selectedAttachment.itemType]}</span>
                  <span className="font-extrabold text-blue-950 truncate">
                    {selectedAttachment.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-blue-700">
                    {selectedAttachment.itemType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="font-bold text-blue-500 hover:text-blue-800"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Staged Photo Preview */}
            {stagedImage ? (
              <div className="relative mb-2 inline-block">
                <img
                  src={stagedImage}
                  alt="staged attachment"
                  className="h-16 w-16 rounded-xl object-cover ring-2 ring-blue-500 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setStagedImage(null)}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white text-[10px] font-bold shadow-md"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Main Composer Row */}
            <div className="flex items-center gap-1.5">
              {/* `+` Expander Action Menu Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(!plusMenuOpen)
                    setEmojiDrawerOpen(false)
                  }}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95',
                    plusMenuOpen
                      ? 'bg-ink text-white rotate-45'
                      : 'bg-black/5 text-ink hover:bg-black/10',
                  )}
                  title="More actions"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                {/* Popover Shelf for + Button */}
                {plusMenuOpen ? (
                  <div className="absolute bottom-12 left-0 z-40 w-52 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 animate-in slide-in-from-bottom-2 duration-150 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPickerTab('post')
                        setAttachmentPickerOpen(true)
                        setPlusMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-ink hover:bg-black/5"
                    >
                      <span className="text-base">💬</span>
                      <span>Share Post Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPickerTab('prompt')
                        setAttachmentPickerOpen(true)
                        setPlusMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-ink hover:bg-black/5"
                    >
                      <span className="text-base">🎨</span>
                      <span>Share AI Prompt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPickerTab('project')
                        setAttachmentPickerOpen(true)
                        setPlusMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-ink hover:bg-black/5"
                    >
                      <span className="text-base">📁</span>
                      <span>Share Project Brand</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click()
                        setPlusMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-ink hover:bg-black/5"
                    >
                      <span className="text-base">📷</span>
                      <span>Send Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQuickRepliesOpen(!quickRepliesOpen)
                        setPlusMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50"
                    >
                      <span className="text-base">⚡</span>
                      <span>Quick Replies…</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Hidden File Input for Photos */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Text Input with classic Messenger "Aa" placeholder */}
              <div className="flex flex-1 items-center rounded-full bg-black/5 px-3 py-1 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition">
                <input
                  type="text"
                  placeholder="Aa"
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  className="w-full bg-transparent py-1.5 text-xs font-semibold text-ink placeholder:text-ink-soft focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => setEmojiDrawerOpen(!emojiDrawerOpen)}
                  className="text-base opacity-70 hover:opacity-100 transition active:scale-90"
                  title="Emoji"
                >
                  😊
                </button>
              </div>

              {/* Messenger Dynamic Action: Thumbs Up 👍 OR Send 🚀 */}
              {textDraft.trim() || selectedAttachment || stagedImage ? (
                <button
                  type="button"
                  disabled={send.isPending}
                  onClick={() => void handleSend()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendThumbsUp}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 active:scale-125 transition text-2xl"
                  title="Send Thumbs Up"
                >
                  👍
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
            VIEW 2: CONVERSATIONS LIST (Messenger "Chats" Inbox)
            ═══════════════════════════════════════════════════════════════════ */
        <div className="mx-auto max-w-[440px] w-full px-4 pt-5 pb-28">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-ink">Chats</h1>
              <p className="text-xs font-bold text-ink-soft">
                Collaborate, chat, and exchange live posts
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 active:scale-95"
              title="New message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Active Collaborators Carousel */}
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft mb-2">
              Active Collaborators
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {conversations.slice(0, 8).map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => selectContact(c.email)}
                  className="flex flex-col items-center gap-1 shrink-0 transition active:scale-95"
                >
                  <div className="rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-sm">
                    <CollaboratorAvatar nameOrEmail={c.email} size="lg" />
                  </div>
                  <span className="w-14 truncate text-center text-[10px] font-extrabold text-ink">
                    {c.displayName}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <Input
              placeholder="Search chats or messages…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          {/* Filter Tabs */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All Chats' },
                { id: 'unread', label: 'Unread' },
                { id: 'posts', label: 'Posts' },
                { id: 'prompts', label: 'Prompts & Projects' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChatsFilter(tab.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-extrabold transition active:scale-95',
                  chatsFilter === tab.id
                    ? 'bg-ink text-white shadow-xs'
                    : 'bg-white/80 text-ink-soft hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversations Thread List */}
          <div className="mt-4 space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="rounded-3xl bg-white/70 p-8 text-center ring-1 ring-black/5 shadow-sm">
                <span className="text-4xl">💬</span>
                <h3 className="mt-2 text-base font-black text-ink">No conversations found</h3>
                <p className="mt-1 text-xs font-semibold text-ink-soft">
                  Start a new conversation with a collaborator to share posts, prompts, and ideas.
                </p>
                <Button
                  className="mt-4 py-2 text-xs font-extrabold"
                  onClick={() => setNewChatOpen(true)}
                >
                  + Start First Chat
                </Button>
              </div>
            ) : null}

            {filteredConversations.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => selectContact(c.email)}
                className="group flex w-full items-center justify-between rounded-2xl bg-white/80 p-3 text-left shadow-xs ring-1 ring-black/5 transition hover:bg-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CollaboratorAvatar nameOrEmail={c.email} size="lg" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-black text-ink">
                        {c.displayName}
                      </span>
                      {c.isPinned ? <span className="text-amber-500 text-xs">★</span> : null}
                    </div>

                    <p
                      className={cn(
                        'truncate text-xs',
                        c.pendingCount > 0 ? 'font-black text-ink' : 'font-semibold text-ink-soft',
                      )}
                    >
                      {c.latestSnippet || 'Tap to start chatting…'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                  <span className="text-[10px] font-bold text-ink-soft">
                    {c.latestTimestamp ? timeAgo(c.latestTimestamp) : ''}
                  </span>

                  {c.pendingCount > 0 ? (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow-xs">
                      +{c.pendingCount}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          <TabBar active="inbox" />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 1: ATTACHMENT PICKER DRAWER (Posts, Prompts, Projects)
          ═══════════════════════════════════════════════════════════════════ */}
      {attachmentPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setAttachmentPickerOpen(false)}
        >
          <div
            className="pg-glass-strong w-full max-w-[420px] rounded-[28px] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <h3 className="pg-title text-base text-ink">Attach Item to Chat</h3>
              <button
                type="button"
                onClick={() => setAttachmentPickerOpen(false)}
                className="text-sm font-extrabold text-ink-soft hover:text-ink"
              >
                ✕
              </button>
            </div>

            {/* Category Tabs: Posts, Prompts, Projects */}
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
                      className="flex w-full items-center justify-between rounded-xl bg-white/60 p-2.5 text-left text-xs font-bold text-ink transition hover:bg-white active:scale-[0.99]"
                    >
                      <span className="truncate pr-2">{p.title || 'Untitled post'}</span>
                      <span className="shrink-0 text-[10px] font-extrabold text-blue-600">Attach +</span>
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
                      className="flex w-full items-center justify-between rounded-xl bg-white/60 p-2.5 text-left text-xs font-bold text-ink transition hover:bg-white active:scale-[0.99]"
                    >
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="shrink-0 text-[10px] font-extrabold text-blue-600">Attach +</span>
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
                      className="flex w-full items-center justify-between rounded-xl bg-white/60 p-2.5 text-left text-xs font-bold text-ink transition hover:bg-white active:scale-[0.99]"
                    >
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="shrink-0 text-[10px] font-extrabold text-blue-600">Attach +</span>
                    </button>
                  ))
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 2: NEW CHAT MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {newChatOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setNewChatOpen(false)}
        >
          <div
            className="pg-glass-strong w-full max-w-[380px] rounded-[28px] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="pg-title text-base text-ink">New Conversation</h3>
            <p className="mt-1 text-xs font-semibold text-ink-soft">
              Enter a collaborator's PostGen email to start chatting and sharing.
            </p>

            <div className="mt-3">
              <Input
                type="email"
                placeholder="collaborator@example.com"
                value={newChatEmail}
                onChange={(e) => setNewChatEmail(e.target.value)}
                className="w-full text-xs"
                autoFocus
              />
            </div>

            {/* Recent Contacts Chips */}
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
                  selectContact(clean)
                  setNewChatOpen(false)
                  setNewChatEmail('')
                }}
              >
                Start Chat →
              </Button>
              <Button
                variant="ghost"
                className="py-2 text-xs font-bold"
                onClick={() => setNewChatOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 3: CALL SIMULATION
          ═══════════════════════════════════════════════════════════════════ */}
      {callingState && activeContactEmail ? (
        <CallSimulationModal
          contactEmail={activeContactEmail}
          displayName={activeContact?.displayName || activeContactEmail.split('@')[0]}
          type={callingState.type}
          onClose={() => setCallingState(null)}
        />
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 4: DETAILS SHEET
          ═══════════════════════════════════════════════════════════════════ */}
      {detailsSheetOpen && activeContactEmail ? (
        <CollaboratorDetailsSheet
          contactEmail={activeContactEmail}
          displayName={activeContact?.displayName || activeContactEmail.split('@')[0]}
          shares={activeContact?.shares ?? []}
          isPinned={pinnedChats.includes(activeContactEmail)}
          onTogglePin={() => {
            togglePinnedChat(activeContactEmail)
            setPinnedChats(loadPinnedChats())
          }}
          onClearHistory={() => {
            clearChatConversation(activeContactEmail, myEmail)
            setChatMessages(loadChatMessages())
            setDetailsSheetOpen(false)
          }}
          onClose={() => setDetailsSheetOpen(false)}
        />
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 5: IMAGE LIGHTBOX
          ═══════════════════════════════════════════════════════════════════ */}
      {lightboxUrl ? (
        <ImageLightboxModal
          url={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      ) : null}
    </main>
  )
}
