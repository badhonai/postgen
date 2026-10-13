import { useEffect, useState, type FormEvent } from 'react'
import type { Asset, PostCategory, PostStatus, Project } from '../../lib/types'
import { CATEGORY_LABELS, STATUS_DOT } from '../../lib/types'
import { blacklistHits } from '../../lib/blacklist'
import { weightedLength, X_WEIGHTED_LIMIT } from '../../lib/text'
import { useAssetUrl } from '../../lib/media'
import { Button, ErrorBox, Input, Select } from '../../components/ui'
import AssetPickerDialog from '../media/AssetPickerDialog'
import type { SavePostInput } from './api'

const STATUSES: PostStatus[] = ['idea', 'draft', 'approved', 'scheduled', 'published', 'archived']

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

/**
 * Post composer — focus mode (one tweet at a time) with each tweet
 * rendered as a live X/Twitter post preview. Keeps the SavePostInput
 * contract: onChange snapshots, onSubmit, blacklist warning.
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
  /** For the X-preview header (name, @handle, logo). */
  project?: Pick<Project, 'name' | 'x_username' | 'logo'> | null
  onSubmit: (input: SavePostInput) => void
  onCancel: () => void
  /** Fires on every edit with the current snapshot (used for autosave + ⌘S). */
  onChange?: (snapshot: SavePostInput) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<PostCategory>(initial?.category ?? 'promotional')
  const [status, setStatus] = useState<PostStatus>(initial?.status ?? 'draft')
  const [tagNames, setTagNames] = useState((initial?.tagNames ?? []).join(', '))
  const [tweets, setTweets] = useState<string[]>(
    initial?.tweets.length ? initial.tweets : [''],
  )
  const [attachments, setAttachments] = useState<Array<{ tweetIndex: number; asset: Asset }>>(
    initial?.media ?? [],
  )
  const [attachFor, setAttachFor] = useState<number | null>(null)
  const [focus, setFocus] = useState(0)

  const snapshot = (): SavePostInput => ({
    postId: initial?.postId,
    projectId: initial!.projectId,
    category,
    status,
    title: title.trim(),
    tweets,
    tagNames: csvToList(tagNames),
    contentText: '', // filled by caller (normalize + hash)
    contentHash: '',
    media: attachments,
    createdVia: initial?.createdVia,
  })

  useEffect(() => {
    onChange?.(snapshot())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot mirrors form state
  }, [title, category, status, tagNames, tweets, attachments])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(snapshot())
  }

  const current = tweets[focus] ?? ''
  const count = weightedLength(current)
  const overLimit = count > X_WEIGHTED_LIMIT
  const blacklistHitList = blacklistHits([title, ...tweets].join('\n'), blacklist)
  const mediaHere = attachments.filter((a) => a.tweetIndex === focus)

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

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <ErrorBox message={error} /> : null}
      {blacklistHitList.length > 0 ? (
        <div className="rounded-[18px] border border-amber-300/70 bg-butter/50 px-4 py-3 text-sm font-bold text-ink">
          ⚠ Blacklisted terms: <strong>{blacklistHitList.join(', ')}</strong> — agents can't
          publish these; you're the human, so this is just a warning.
        </div>
      ) : null}

      {/* title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title (internal)"
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

      {/* thread stepper */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Previous tweet"
          onClick={() => setFocus((f) => Math.max(0, f - 1))}
          disabled={focus === 0}
          className="pg-glass flex h-9 w-9 items-center justify-center rounded-full text-ink disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-1 gap-1.5">
          {tweets.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Tweet ${i + 1}`}
              onClick={() => setFocus(i)}
              className={`h-2 flex-1 rounded-full transition ${
                i === focus ? 'bg-butter shadow-[0_4px_12px_rgba(242,193,78,0.5)]' : 'bg-white/55'
              }`}
            />
          ))}
        </div>
        <span className="w-10 text-center text-xs font-extrabold text-ink-soft">
          {focus + 1}/{tweets.length}
        </span>
        <button
          type="button"
          aria-label="Next tweet"
          onClick={() => setFocus((f) => Math.min(tweets.length - 1, f + 1))}
          disabled={focus >= tweets.length - 1}
          className="pg-glass flex h-9 w-9 items-center justify-center rounded-full text-ink disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* X preview card */}
      <div className="pg-glass rounded-[26px] p-5">
        <div className="flex items-center gap-2.5">
          <PreviewAvatar project={project} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold text-ink">{project?.name ?? 'Project'}</p>
            <p className="truncate text-xs font-bold text-ink-soft">
              @{project?.x_username ?? 'project'}
            </p>
          </div>
          <span
            className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: STATUS_DOT[status] ?? '#a09cc4' }}
            title={status}
          />
        </div>

        <textarea
          value={current}
          onChange={(e) => setAt(focus, e.target.value)}
          rows={Math.min(12, Math.max(3, Math.ceil(current.length / 32)))}
          placeholder={tweets.length > 1 ? `Tweet ${focus + 1} — what's the message?` : "What's the message?"}
          className="mt-3 w-full resize-none bg-transparent text-[15px] leading-relaxed font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
        />

        {mediaHere.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mediaHere.map((m) => (
              <AttachmentChip
                key={m.asset.id}
                asset={m.asset}
                onRemove={() =>
                  setAttachments((a) => a.filter((x) => x.asset.id !== m.asset.id))
                }
              />
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2 border-t border-white/50 pt-3">
          <button
            type="button"
            onClick={() => setAttachFor(focus)}
            className="rounded-full bg-white/55 px-3 py-1.5 text-xs font-bold text-ink hover:bg-white/75"
          >
            📎 Attach
          </button>
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={focus === 0}
            className="rounded-full bg-white/55 px-3 py-1.5 text-xs font-bold text-ink hover:bg-white/75 disabled:opacity-40"
          >
            ← Earlier
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={focus >= tweets.length - 1}
            className="rounded-full bg-white/55 px-3 py-1.5 text-xs font-bold text-ink hover:bg-white/75 disabled:opacity-40"
          >
            Later →
          </button>
          <span
            className={`ml-auto rounded-full px-2.5 py-1 text-xs font-extrabold ${
              overLimit ? 'bg-rose-soft text-rose-700' : 'bg-white/55 text-ink-soft'
            }`}
          >
            {count}/{X_WEIGHTED_LIMIT}
          </span>
        </div>
      </div>

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
