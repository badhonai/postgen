import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { checkDuplicates, hasBlockingDuplicates, type DupCheck, type SimilarPost } from '../lib/dedupe'
import { projectBlacklist } from '../lib/blacklist'
import { numberedTweets } from '../lib/text'
import {
  useDeletePost,
  usePost,
  useSavePost,
  useSetPostStatus,
  type SavePostInput,
} from '../features/posts/api'
import { useProject } from '../features/projects/api'
import { useQuery } from '@tanstack/react-query'
import { getSignedUrl } from '../lib/media'
import { fetchXProfile } from '../lib/xprofile'
import { useAuth } from '../features/auth/context'
import type { Asset } from '../lib/types'
import { useAssetUrl } from '../lib/media'
import PostForm from '../features/posts/PostForm'
import DuplicateDialog from '../features/posts/DuplicateDialog'
import { Button, ErrorBox, Spinner } from '../components/ui'

/**
 * The identity the post will go out under: the X handle saved on the profile,
 * with its real display name and profile picture. Falls back to the handle
 * itself when the profile lookup is unavailable.
 */
function XIdentity() {
  const { user } = useAuth()
  const handle = String((user?.user_metadata as { x_username?: string } | undefined)?.x_username ?? '').replace(/^@/, '')
  const profile = useQuery({
    queryKey: ['x-profile', handle],
    enabled: !!handle,
    queryFn: () => fetchXProfile(handle),
    staleTime: 5 * 60 * 1000,
  })
  const avatar = profile.data?.avatarUrl || (handle ? `https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false` : null)
  const name = profile.data?.name || handle || 'Your account'

  if (!handle) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 font-display text-lg font-semibold text-ink-soft">
          ?
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-ink">No X handle yet</p>
          <Link to="/profile" className="text-[12px] font-bold text-ink-soft underline">
            Add it in your profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        <img
          src={avatar}
          alt=""
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden'
          }}
          className="h-11 w-11 rounded-full bg-white/70 object-cover ring-1 ring-white/70"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint font-display text-lg font-semibold text-ink">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-[14px] font-extrabold text-ink">{name}</p>
        <p className="truncate text-[12px] font-bold text-ink-soft">@{handle}</p>
      </div>
    </div>
  )
}

/** One attached image inside the preview sheet. */
function PreviewImage({ asset }: { asset: { r2_key: string; mime_type: string; filename: string } }) {
  const url = useAssetUrl(asset.r2_key)
  if (!url.data) return <div className="aspect-video w-full rounded-[16px] bg-white/60" />
  return (
    <img
      src={url.data}
      alt=""
      className="aspect-video w-full rounded-[16px] object-cover"
    />
  )
}

export default function PostEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  // Two "new" entry shapes: /projects/:id/posts/new (here :id is the PROJECT)
  // and /posts/new?project=… . Everything else (/posts/:id) is edit mode.
  const onNewProjectRoute = /\/projects\/[^/]+\/posts\/new$/.test(location.pathname)
  const isNew = onNewProjectRoute || !id || id === 'new'
  const editId = !isNew && id && id !== 'new' ? id : ''

  const post = usePost(editId)
  const savePost = useSavePost()
  const deletePost = useDeletePost()
  const setPostStatus = useSetPostStatus()

  const [dupCheck, setDupCheck] = useState<DupCheck | null>(null)
  const [pendingInput, setPendingInput] = useState<SavePostInput | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [similarBanner, setSimilarBanner] = useState<SimilarPost[] | null>(null)
  const [postedAsk, setPostedAsk] = useState(false)
  const [postedError, setPostedError] = useState<string | null>(null)
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null)

  const latestRef = useRef<SavePostInput | null>(null)
  const lastSavedRef = useRef<string>('')
  const timerRef = useRef<number | undefined>(undefined)
  const hydratedRef = useRef(false)

  const projectId = isNew
    ? onNewProjectRoute
      ? (id ?? '')
      : (params.get('project') ?? '')
    : (post.data?.project_id ?? '')
  const postData = post.data ?? null
  const project = useProject(projectId)

  // ── autosave (existing drafts only): silent save + non-blocking similar banner ──
  const serialize = (snap: SavePostInput) =>
    JSON.stringify([snap.title, snap.status, snap.category, snap.tagNames, snap.tweets, snap.media.map((m) => m.asset.id)])

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current)
  }, [])

  const runAutosave = async () => {
    const snap = latestRef.current
    if (!snap?.postId || dupCheck || savePost.isPending) return
    if (snap.status !== 'idea' && snap.status !== 'draft') return
    if (serialize(snap) === lastSavedRef.current) return
    const tweets = snap.tweets.map((t) => t.trim()).filter(Boolean)
    if (tweets.length === 0) return
    try {
      const check = await checkDuplicates(tweets, {
        excludePostId: snap.postId,
        projectId: snap.projectId,
        extraText:
          snap.type === 'quote'
            ? [String(snap.meta?.source ?? ''), String(snap.meta?.comment ?? '')]
                .filter(Boolean)
                .join('\n')
            : undefined,
      })
      setSimilarBanner(hasBlockingDuplicates(check) ? check.similar : null)
      await savePost.mutateAsync({ ...snap, tweets, contentText: check.contentText, contentHash: check.contentHash })
      lastSavedRef.current = serialize(snap)
      setAutosavedAt(Date.now())
    } catch {
      /* autosave is best-effort — explicit save reports errors */
    }
  }

  const onFormChange = (snap: SavePostInput) => {
    latestRef.current = snap
    // first emission = pristine form state → baseline, no autosave
    if (!hydratedRef.current) {
      hydratedRef.current = true
      if (snap.postId) lastSavedRef.current = serialize(snap)
      return
    }
    if (isNew) return
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => void runAutosave(), 2000)
  }

  // ⌘S / Ctrl+S → explicit save (full no-repeat gate)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (latestRef.current) void handleSubmit(latestRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, id])

  if (!isNew && post.isPending) {
    return (
      <main className="pg-shell">
        <div className="mx-auto max-w-[440px] px-5 pt-10">
          <Spinner />
        </div>
      </main>
    )
  }

  if (!isNew && post.error) {
    return (
      <main className="pg-shell">
        <div className="mx-auto max-w-[440px] px-5 pt-10">
          <ErrorBox message={post.error instanceof Error ? post.error.message : 'Failed to load post'} />
        </div>
      </main>
    )
  }

  if (!isNew && !post.data) {
    return (
      <main className="pg-shell">
        <div className="mx-auto max-w-[440px] px-5 pt-10">
          <h1 className="pg-title text-2xl text-ink">Post not found</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-bold text-ink underline underline-offset-2">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  const initial: SavePostInput | undefined =
    postData && !isNew
      ? {
          postId: postData.id,
          projectId: postData.project_id,
          type: postData.post_type ?? 'post',
          category: postData.category,
          status: postData.status,
          title: postData.title,
          tweets: postData.post_tweets.map((t) => t.content),
          tagNames: postData.tags,
          contentText: '',
          contentHash: '',
          media: postData.post_tweets.flatMap((t, i) =>
            (postData.mediaByTweet[t.id] ?? []).map((asset) => ({ tweetIndex: i, asset })),
          ),
          meta: (postData.meta ?? {}) as Record<string, unknown>,
        }
      : projectId
        ? {
            postId: undefined,
            projectId,
            type: 'post',
            category: 'promotional',
            status: 'draft',
            title: '',
            tweets: [''],
            tagNames: [],
            contentText: '',
            contentHash: '',
            media: [],
            meta: {},
          }
        : undefined

  if (!initial) {
    return (
      <main className="pg-shell">
        <div className="mx-auto max-w-[440px] px-5 pt-10">
          <ErrorBox message="Missing project — create this post from a project page." />
        </div>
      </main>
    )
  }

  const persist = async (input: SavePostInput, check: DupCheck) => {
    const savedId = await savePost.mutateAsync({
      ...input,
      tweets: input.tweets.map((t) => t.trim()).filter(Boolean),
      contentText: check.contentText,
      contentHash: check.contentHash,
    })
    if (isNew) navigate(`/posts/${savedId}`, { replace: true })
    else setDupCheck(null)
  }

  const handleSubmit = async (input: SavePostInput) => {
    setFormError(null)
    const tweets = input.tweets.map((t) => t.trim()).filter(Boolean)
    if (tweets.length === 0) {
      setFormError('Add at least one tweet.')
      return
    }

    try {
      const check = await checkDuplicates(tweets, {
        excludePostId: input.postId,
        projectId: input.projectId,
        // a quote is the quote + source + take — dedupe must see all of it
        extraText:
          input.type === 'quote'
            ? [String(input.meta?.source ?? ''), String(input.meta?.comment ?? '')]
                .filter(Boolean)
                .join('\n')
            : undefined,
      })
      if (hasBlockingDuplicates(check)) {
        setDupCheck(check)
        setPendingInput(input)
        return
      }
      await persist(input, check)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1500)
  }

  /** Live form snapshot when there is one, else the saved post. */
  const draft = latestRef.current
  const previewTweets = draft?.tweets?.length ? draft.tweets : (postData?.post_tweets ?? []).map((t) => t.content)
  const previewText =
    previewTweets.length === 1 ? previewTweets[0] : numberedTweets(previewTweets)
  // the form snapshot only exists once you touch a field, so fall back to the
  // saved post's attachments — otherwise a freshly opened post previews bare
  const savedMedia = Object.values(postData?.mediaByTweet ?? {}).flat()
  const previewMedia: Array<{ asset: Asset }> =
    draft?.media ?? savedMedia.map((asset) => ({ asset }))

  /**
   * Send the post to X. X's intent URL carries text only, so on phones we use
   * the share sheet instead: it accepts the image files alongside the text, so
   * the picture really does travel with the words. The web intent is the
   * fallback for desktop, where the image is attached by hand.
   */
  const shareToX = async () => {
    setMenuOpen(false)
    setPreview(false)
    setSharing(true)
    let done = false
    try {
      const files: File[] = []
      for (const m of previewMedia.slice(0, 4)) {
        if (!m.asset.mime_type.startsWith('image/')) continue
        try {
          const url = await getSignedUrl(m.asset.r2_key)
          const blob = await (await fetch(url)).blob()
          files.push(new File([blob], m.asset.filename || 'image.png', { type: m.asset.mime_type }))
        } catch {
          /* one unreadable asset shouldn't sink the whole share */
        }
      }
      if (files.length > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
        await navigator.share({ files, text: previewText })
        done = true
        if (postData && postData.status !== 'published') setPostedAsk(true)
      }
    } catch (err) {
      // closing the sheet is not a failure — just stop
      if ((err as DOMException | undefined)?.name === 'AbortError') done = true
    } finally {
      setSharing(false)
    }
    if (done) return
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(previewText)}`, '_blank', 'noopener')
    // X opened in a new tab — when the user comes back, ask whether it
    // actually went out so the board stays truthful.
    if (postData && postData.status !== 'published') setPostedAsk(true)
  }

  return (
    <main className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-16">
        {/* ── header: title on its own line, actions on a row beneath it ── */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back"
              onClick={() => navigate(projectId ? `/projects/${projectId}` : '/dashboard')}
              className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="pg-title truncate text-2xl text-ink">
                {isNew ? 'New post' : 'Edit post'}
              </h1>
              <p className="truncate text-xs font-bold text-ink-soft">
                {isNew
                  ? 'Repeats are blocked — every save is checked.'
                  : postData
                    ? `${postData.post_tweets.length} tweet${postData.post_tweets.length > 1 ? 's' : ''} · via ${postData.created_via}${autosavedAt ? ` · autosaved ${new Date(autosavedAt).toLocaleTimeString()}` : ''}`
                    : ''}
              </p>
            </div>
            {!isNew && postData ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label="More actions"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="pg-glass flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-ink transition active:scale-95"
                >
                  ⋯
                </button>
                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="pg-glass-strong absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-2xl p-1.5 shadow-[0_18px_40px_rgba(70,60,130,0.22)]">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          void copy(
                            postData.post_tweets.length === 1
                              ? postData.post_tweets[0].content
                              : numberedTweets(postData.post_tweets.map((t) => t.content)),
                            'copy',
                          )
                        }}
                        className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-white/70"
                      >
                        {copied === 'copy' ? 'Copied ✓' : 'Copy text'}
                      </button>
                      <button
                        type="button"
                        disabled={deletePost.isPending}
                        onClick={() => {
                          setMenuOpen(false)
                          if (!window.confirm('Delete this post? This cannot be undone.')) return
                          deletePost.mutate(postData.id, {
                            onSuccess: () =>
                              navigate(projectId ? `/projects/${projectId}` : '/dashboard', {
                                replace: true,
                              }),
                          })
                        }}
                        className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-rose-700 transition hover:bg-white/70 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {!isNew && postData ? (
            <div className="flex gap-2">
              <Button
                variant="accent"
                className="flex-1 py-3 text-[15px]"
                disabled={sharing}
                onClick={() => void shareToX()}
              >
                {sharing ? 'Opening…' : 'Post on X'}
              </Button>
              <Button variant="ghost" className="py-3 text-[15px]" onClick={() => setPreview(true)}>
                Preview
              </Button>
            </div>
          ) : null}
        </header>

        {/* ── similar-post banner (non-blocking, autosave) ── */}
        {similarBanner ? (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-[18px] border border-amber-300/70 bg-butter/50 px-4 py-3 text-sm font-semibold text-ink">
            <p>
              ⚠️ This draft is very similar to{' '}
              {similarBanner.slice(0, 2).map((s, i) => (
                <span key={s.id}>
                  {i > 0 ? ' and ' : ''}
                  <Link to={`/posts/${s.id}`} className="font-bold underline underline-offset-2">
                    {s.title || 'an untitled post'}
                  </Link>{' '}
                  ({Math.round(s.similarity * 100)}%)
                </span>
              ))}
              . Autosaved anyway — edit one of them to avoid a repeat.
            </p>
            <button
              type="button"
              className="shrink-0 font-bold text-ink-soft hover:text-ink"
              onClick={() => setSimilarBanner(null)}
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="mt-6">
          <PostForm
            initial={initial}
            busy={savePost.isPending}
            error={formError ?? (savePost.error instanceof Error ? savePost.error.message : null)}
            blacklist={projectBlacklist(project.data?.brand_voice)}
            project={project.data}
            onSubmit={handleSubmit}
            onCancel={() =>
              navigate(projectId ? `/projects/${projectId}` : '/dashboard', { replace: true })
            }
            onChange={onFormChange}
          />
        </div>

        {/* ── preview: how this post will read once it is live ── */}
        {preview && !isNew ? (
          <div
            className="fixed inset-0 z-50 flex items-end bg-ink/45 px-3 pt-10 pb-6"
            onClick={() => setPreview(false)}
          >
            <div
              className="pg-glass-strong mx-auto w-full max-w-[440px] rounded-[26px] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="pg-title text-lg text-ink">Preview</h2>
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setPreview(false)}
                  className="pg-glass flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-ink transition active:scale-95"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-[20px] bg-white p-4">
                <XIdentity />

                <p className="mt-3 text-[15px] leading-relaxed font-semibold whitespace-pre-wrap text-ink">
                  {previewText || 'Nothing to preview yet.'}
                </p>

                {previewMedia.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {previewMedia.slice(0, 4).map((m) => (
                      <PreviewImage key={m.asset.id} asset={m.asset} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="accent"
                  className="flex-1 py-3 text-[15px]"
                  disabled={sharing}
                  onClick={() => void shareToX()}
                >
                  {sharing ? 'Opening…' : 'Post on X'}
                </Button>
                <Button variant="ghost" className="py-3 text-[15px]" onClick={() => setPreview(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {postedAsk && postData ? (
          <div className="fixed inset-0 z-50 flex items-end bg-ink/45 px-3 pt-10 pb-6" onClick={() => setPostedAsk(false)}>
            <div
              className="pg-glass-strong mx-auto w-full max-w-[440px] rounded-[26px] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="pg-title text-xl text-ink">Did you post it on X?</h2>
              <p className="mt-1.5 text-sm leading-relaxed font-semibold text-ink-soft">
                If it's live, I'll move this post to <strong className="text-ink">Published</strong> so your
                board stays truthful. On desktop, X opens with text only — make sure you attached the
                image there before posting.
              </p>
              {postedError ? (
                <div className="mt-3">
                  <ErrorBox message={postedError} />
                </div>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="accent"
                  className="flex-1 py-3"
                  disabled={setPostStatus.isPending}
                  onClick={() => {
                    setPostedError(null)
                    setPostStatus.mutate(
                      { id: postData.id, status: 'published' },
                      {
                        onSuccess: () => setPostedAsk(false),
                        onError: (e) =>
                          setPostedError(e instanceof Error ? e.message : 'Could not mark as published'),
                      },
                    )
                  }}
                >
                  {setPostStatus.isPending ? 'Saving…' : 'Yes — mark as Published'}
                </Button>
                <Button variant="ghost" className="py-3" onClick={() => setPostedAsk(false)}>
                  Not yet
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {dupCheck && pendingInput ? (
          <DuplicateDialog
            duplicateOf={dupCheck.duplicateOf}
            similar={dupCheck.similar}
            busy={savePost.isPending}
            onSaveAnyway={() => {
              void persist(pendingInput, dupCheck).catch((err) => {
                setFormError(err instanceof Error ? err.message : 'Failed to save')
                setDupCheck(null)
              })
            }}
            onCancel={() => {
              setDupCheck(null)
              setPendingInput(null)
            }}
          />
        ) : null}
      </div>
    </main>
  )
}
