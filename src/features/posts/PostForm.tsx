import { useEffect, useState, type FormEvent } from 'react'
import type { Asset, PostCategory, PostStatus, PostType, Project } from '../../lib/types'
import {
  CATEGORY_LABELS,
  POST_TYPES,
  POST_TYPE_HINT,
  POST_TYPE_LABEL,
  POST_TYPE_LIMIT,
  STATUS_DOT,
} from '../../lib/types'
import { blacklistHits } from '../../lib/blacklist'
import { weightedLength } from '../../lib/text'
import { useAssetUrl } from '../../lib/media'
import { Button, ErrorBox, Input, Select } from '../../components/ui'
import AssetPickerDialog from '../media/AssetPickerDialog'
import type { SavePostInput } from './api'

const STATUSES: PostStatus[] = ['idea', 'draft', 'approved', 'scheduled', 'published', 'archived']

/** Types that hold exactly one content block (tweets[0]). */
const SINGLE_BLOCK: PostType[] = ['post', 'article', 'artwork', 'quote']

const TYPE_ICON: Record<PostType, string> = {
  post: '💬',
  thread: '🧵',
  article: '📄',
  artwork: '🎨',
  quote: '❝',
}

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean)
}

function AttachmentChip({ asset, onRemove }: { asset: Asset; onRemove: () => void }) {
  const url = useAssetUrl(asset.r2_key)
  const isImage = asset.mime_type.startsWith('image/')
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/65 py-1 pr-1 pl-1.5 text-xs font-bold text-ink">
      {isImage && url.data ? (
        <img src={url.data} alt="" className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span>{isImage ? '🖼' : '🎬'}</span>
      )}
      <span className="max-w-32 truncate">{asset.filename}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full px-1.5 text-ink-soft hover:bg-white hover:text-ink"
        aria-label={`Remove ${asset.filename}`}
      >
        ✕
      </button>
    </span>
  )
}

function PreviewAvatar({ project }: { project?: Pick<Project, 'name' | 'x_username' | 'logo'> | null }) {
  const url = useAssetUrl(project?.logo?.r2_key)
  if (url.data) {
    return <img src={url.data} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-white/70" />
  }
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint font-display text-lg text-ink">
      {(project?.name ?? 'P').slice(0, 1)}
    </div>
  )
}

function CardHead({
  project,
  status,
  badge,
}: {
  project?: Pick<Project, 'name' | 'x_username' | 'logo'> | null
  status: PostStatus
  badge?: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <PreviewAvatar project={project} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-extrabold text-ink">{project?.name ?? 'Project'}</p>
        <p className="truncate text-xs font-bold text-ink-soft">@{project?.x_username ?? 'project'}</p>
      </div>
      {badge ? (
        <span className="ml-auto shrink-0 rounded-full bg-butter px-2 py-0.5 text-[10px] font-extrabold text-ink">
          {badge}
        </span>
      ) : null}
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${badge ? '' : 'ml-auto'}`}
        style={{ background: STATUS_DOT[status] ?? '#a09cc4' }}
        title={status}
      />
    </div>
  )
}

/**
 * Post composer — one editor per post type.
 *
 *   post     a single post (280)
 *   thread   n posts (280 each) with the focus-mode stepper
 *   article  title + long-form body (no 280 cap)
 *   artwork  media first, then a caption (280)
 *   quote    the quote, who said it, your take
 *
 * Keeps the SavePostInput contract: onChange snapshots, onSubmit,
 * blacklist warning.
 */
export default function PostForm({
  initial,
  busy,
  error,
  blacklist,
  project,
  onSubmit,
  onCancel,
  onChange,
}: {
  initial?: SavePostInput
  busy: boolean
  error?: string | null
  /** Project blacklist entries — hits warn (not block) while writing. */
  blacklist?: string[]
  /** For the preview header (name, @handle, logo). */
  project?: Pick<Project, 'name' | 'x_username' | 'logo'> | null
  onSubmit: (input: SavePostInput) => void
  onCancel: () => void
  /** Fires on every edit with the current snapshot (used for autosave + ⌘S). */
  onChange?: (snapshot: SavePostInput) => void
}) {
  const meta = (initial?.meta ?? {}) as { source?: string; comment?: string }
  const [type, setType] = useState<PostType>(initial?.type ?? 'post')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<PostCategory>(initial?.category ?? 'promotional')
  const [status, setStatus] = useState<PostStatus>(initial?.status ?? 'draft')
  const [tagNames, setTagNames] = useState((initial?.tagNames ?? []).join(', '))
  const [tweets, setTweets] = useState<string[]>(initial?.tweets.length ? initial.tweets : [''])
  const [source, setSource] = useState(meta.source ?? '')
  const [comment, setComment] = useState(meta.comment ?? '')
  const [attachments, setAttachments] = useState<Array<{ tweetIndex: number; asset: Asset }>>(
    initial?.media ?? [],
  )
  const [attachFor, setAttachFor] = useState<number | null>(null)
  const [focus, setFocus] = useState(0)

  const snapshot = (): SavePostInput => ({
    postId: initial?.postId,
    projectId: initial!.projectId,
    type,
    category,
    status,
    title: title.trim(),
    tweets,
    tagNames: csvToList(tagNames),
    contentText: '', // filled by caller (normalize + hash)
    contentHash: '',
    media: attachments,
    meta: type === 'quote' ? { source: source.trim(), comment: comment.trim() } : {},
    createdVia: initial?.createdVia,
  })

  useEffect(() => {
    onChange?.(snapshot())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot mirrors form state
  }, [type, title, category, status, tagNames, tweets, source, comment, attachments])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(snapshot())
  }

  // ── derived ──
  const limit = POST_TYPE_LIMIT[type]
  const current = tweets[focus] ?? ''
  const count = weightedLength(current)
  const overLimit = count > limit
  const words = current.trim() ? current.trim().split(/\s+/).length : 0
  const blacklistHitList = blacklistHits(
    [title, ...tweets, source, comment].join('\n'),
    blacklist,
  )
  const mediaHere = attachments.filter((a) => a.tweetIndex === focus)
  const isThread = type === 'thread'

  // ── type switching: multi-block types keep every tweet, others collapse to one ──
  const switchType = (next: PostType) => {
    if (next === type) return
    setType(next)
    if (!SINGLE_BLOCK.includes(next)) return
    setTweets((prev) => [prev[0] ?? ''])
    setAttachments((prev) => prev.filter((m) => m.tweetIndex === 0))
    setFocus(0)
  }

  const setAt = (i: number, value: string) => {
    const next = [...tweets]
    next[i] = value
    setTweets(next)
  }

  const addTweet = () => {
    setTweets((t) => [...t, ''])
    setFocus(tweets.length)
  }

  const removeTweet = (i: number) => {
    if (tweets.length <= 1) return
    setTweets((t) => t.filter((_, j) => j !== i))
    setAttachments((a) =>
      a
        .filter((m) => m.tweetIndex !== i)
        .map((m) => (m.tweetIndex > i ? { ...m, tweetIndex: m.tweetIndex - 1 } : m)),
    )
    setFocus((f) => (f > i ? f - 1 : f === i ? Math.max(0, i - 1) : f))
  }

  const move = (dir: -1 | 1) => {
    const j = focus + dir
    if (j < 0 || j >= tweets.length) return
    const next = [...tweets]
    ;[next[focus], next[j]] = [next[j], next[focus]]
    setTweets(next)
    setAttachments((a) =>
      a.map((m) =>
        m.tweetIndex === focus
          ? { ...m, tweetIndex: j }
          : m.tweetIndex === j
            ? { ...m, tweetIndex: focus }
            : m,
      ),
    )
    setFocus(j)
  }

  const counter = (
    <span
      className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${
        overLimit ? 'bg-rose-soft text-rose-700' : 'bg-white/55 text-ink-soft'
      }`}
    >
      {type === 'article' ? `${words} words` : `${count}/${limit}`}
    </span>
  )

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <ErrorBox message={error} /> : null}
      {blacklistHitList.length > 0 ? (
        <div className="rounded-[18px] border border-amber-300/70 bg-butter/50 px-4 py-3 text-sm font-bold text-ink">
          ⚠ Blacklisted terms: <strong>{blacklistHitList.join(', ')}</strong> — agents can't
          publish these; you're the human, so this is just a warning.
        </div>
      ) : null}

      {/* ── type picker ── */}
      <div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {POST_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => switchType(t)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold whitespace-nowrap transition active:scale-95 ${
                type === t
                  ? 'bg-butter text-ink shadow-[0_6px_16px_rgba(242,193,78,0.45)]'
                  : 'pg-glass text-ink-soft'
              }`}
            >
              <span aria-hidden>{TYPE_ICON[t]}</span>
              {POST_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-1 text-[11px] font-bold text-ink-soft">{POST_TYPE_HINT[type]}</p>
      </div>

      {/* title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={type === 'article' ? 'Article title' : 'Post title (internal)'}
        className="pg-title w-full bg-transparent text-[1.7rem] text-ink placeholder:text-ink-soft/60 focus:outline-none"
      />

      {/* meta chips */}
      <div className="flex gap-2">
        <Select value={category} onChange={(e) => setCategory(e.target.value as PostCategory)} className="flex-1 py-2">
          {(Object.keys(CATEGORY_LABELS) as PostCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as PostStatus)} className="flex-1 py-2">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
      </div>
      <Input
        value={tagNames}
        onChange={(e) => setTagNames(e.target.value)}
        placeholder="Tags — comma separated (product, education…)"
        className="py-2"
      />

      {/* ── thread stepper ── */}
      {isThread ? (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1.5">
            {tweets.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Tweet ${i + 1}`}
                onClick={() => setFocus(i)}
                className="min-w-0 flex-1"
              >
                <span
                  className={`block truncate text-center text-[10px] font-extrabold ${
                    i === focus ? 'text-ink' : 'text-ink-soft/70'
                  }`}
                >
                  Tweet {i + 1}
                </span>
                <span
                  className={`mt-1 block h-2 rounded-full transition ${
                    i <= focus ? 'bg-butter shadow-[0_4px_12px_rgba(242,193,78,0.5)]' : 'bg-white/55'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-butter text-xs font-extrabold text-ink">
            {focus + 1}/{tweets.length}
          </span>
        </div>
      ) : null}

      {/* ── per-type editor ── */}
      {type === 'article' ? (
        <div className="pg-glass rounded-[26px] p-5">
          <CardHead project={project} status={status} badge="Article" />
          <p className="pg-title mt-4 text-xl leading-snug text-ink">
            {title || 'Untitled article'}
          </p>
          <textarea
            value={current}
            onChange={(e) => setAt(focus, e.target.value)}
            rows={10}
            placeholder="Write the article — no character limit."
            className="mt-2 w-full resize-none bg-transparent text-[15px] leading-relaxed font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-1.5 border-t border-white/50 pt-3">{counter}</div>
        </div>
      ) : type === 'quote' ? (
        <div className="pg-glass rounded-[26px] p-5">
          <CardHead project={project} status={status} badge="Quote" />
          <textarea
            value={current}
            onChange={(e) => setAt(focus, e.target.value)}
            rows={4}
            placeholder="The quote…"
            className="mt-3 w-full resize-none rounded-[18px] border border-white/70 bg-white/60 px-3.5 py-3 text-[15px] leading-relaxed font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Who said it? e.g. Vitalik Buterin"
            className="mt-2 py-2"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Your take (optional)"
            className="mt-2 w-full resize-none bg-transparent text-[15px] leading-relaxed font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-1.5 border-t border-white/50 pt-3">{counter}</div>
        </div>
      ) : type === 'artwork' ? (
        <div className="pg-glass rounded-[26px] p-5">
          <CardHead project={project} status={status} badge="Artwork" />
          {/* media first */}
          <div className="mt-3 space-y-2">
            {mediaHere.map((m) => (
              <AttachedImage
                key={m.asset.id}
                asset={m.asset}
                onRemove={() => setAttachments((a) => a.filter((x) => x.asset.id !== m.asset.id))}
              />
            ))}
            <button
              type="button"
              onClick={() => setAttachFor(focus)}
              className="flex aspect-video w-full items-center justify-center rounded-[18px] border-2 border-dashed border-white/70 text-sm font-bold text-ink-soft transition hover:bg-white/40"
            >
              {mediaHere.length > 0 ? '+ Add another' : '🎨 Add artwork'}
            </button>
          </div>
          <textarea
            value={current}
            onChange={(e) => setAt(focus, e.target.value)}
            rows={3}
            placeholder="Caption…"
            className="mt-3 w-full resize-none bg-transparent text-[15px] leading-relaxed font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-1.5 border-t border-white/50 pt-3">{counter}</div>
        </div>
      ) : (
        /* post + thread: the live X post card */
        <div className="relative">
          {isThread ? (
            <>
              <button
                type="button"
                aria-label="Previous tweet"
                onClick={() => setFocus((f) => Math.max(0, f - 1))}
                disabled={focus === 0}
                className="pg-glass absolute top-[38%] -left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-ink shadow-[0_8px_20px_rgba(70,60,130,0.18)] disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next tweet"
                onClick={() => setFocus((f) => Math.min(tweets.length - 1, f + 1))}
                disabled={focus >= tweets.length - 1}
                className="pg-glass absolute top-[38%] -right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-ink shadow-[0_8px_20px_rgba(70,60,130,0.18)] disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          ) : null}
          <div className="pg-glass rounded-[26px] p-5">
            <CardHead project={project} status={status} />

            <textarea
              value={current}
              onChange={(e) => setAt(focus, e.target.value)}
              rows={Math.min(12, Math.max(3, Math.ceil(current.length / 32)))}
              placeholder={isThread ? `Tweet ${focus + 1} — what's the message?` : "What's the message?"}
              className="mt-3 w-full resize-none bg-transparent text-[15px] leading-relaxed font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
            />

            {mediaHere.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mediaHere.map((m) => (
                  <AttachmentChip
                    key={m.asset.id}
                    asset={m.asset}
                    onRemove={() => setAttachments((a) => a.filter((x) => x.asset.id !== m.asset.id))}
                  />
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-1.5 border-t border-white/50 pt-3">
              <button
                type="button"
                onClick={() => setAttachFor(focus)}
                className="rounded-full bg-white/55 px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-ink hover:bg-white/75"
              >
                📎 Attach
              </button>
              {isThread ? (
                <>
                  <button
                    type="button"
                    onClick={() => move(-1)}
                    disabled={focus === 0}
                    className="rounded-full bg-white/55 px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-ink hover:bg-white/75 disabled:opacity-40"
                  >
                    ← Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => move(1)}
                    disabled={focus >= tweets.length - 1}
                    className="rounded-full bg-white/55 px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-ink hover:bg-white/75 disabled:opacity-40"
                  >
                    Later →
                  </button>
                </>
              ) : null}
              {counter}
            </div>
          </div>
        </div>
      )}

      {isThread ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addTweet}
            className="rounded-full border-2 border-dashed border-white/70 px-4 py-2 text-sm font-bold text-ink hover:bg-white/40"
          >
            + Add tweet
          </button>
          {tweets.length > 1 ? (
            <button
              type="button"
              onClick={() => removeTweet(focus)}
              className="rounded-full bg-rose-soft/60 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-soft"
            >
              Delete tweet {focus + 1}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? 'Saving…' : status === 'draft' ? 'Save draft' : 'Save post'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>

      {attachFor !== null ? (
        <AssetPickerDialog
          projectId={initial!.projectId}
          onSelect={(asset) => {
            setAttachments((a) => [...a, { tweetIndex: attachFor, asset }])
            setAttachFor(null)
          }}
          onClose={() => setAttachFor(null)}
        />
      ) : null}
    </form>
  )
}

/** 16:9 artwork tile with a remove button. */
function AttachedImage({ asset, onRemove }: { asset: Asset; onRemove: () => void }) {
  const url = useAssetUrl(asset.r2_key)
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[18px] bg-white/50">
      {url.data ? (
        <a
          href={url.data}
          target="_blank"
          rel="noreferrer"
          title="Open full size to attach on X"
          className="block h-full w-full"
        >
          <img src={url.data} alt={asset.alt_text ?? asset.filename} className="h-full w-full object-cover" />
        </a>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl">🎨</div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${asset.filename}`}
        className="pg-glass absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-ink"
      >
        ✕
      </button>
    </div>
  )
}
