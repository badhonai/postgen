import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { checkDuplicates, hasBlockingDuplicates, type DupCheck, type SimilarPost } from '../lib/dedupe'
import { projectBlacklist } from '../lib/blacklist'
import { numberedTweets, sha256Hex } from '../lib/text'
import {
  useDeletePost,
  usePost,
  usePosts,
  useSavePost,
  useSetPostStatus,
  type SavePostInput,
} from '../features/posts/api'
import { useProject } from '../features/projects/api'
import { getSignedUrl } from '../lib/media'
import { POST_TYPES, STATUS_DOT, STATUS_LABEL, type Asset, type PostStatus } from '../lib/types'
import PostForm from '../features/posts/PostForm'
import ShareDialog from '../features/shares/ShareDialog'
import DuplicateDialog from '../features/posts/DuplicateDialog'
import { Button, ErrorBox, Spinner } from '../components/ui'

/**
 * The one-tap status moves offered on the edit page, per current status.
 * Draft → Approve, Approved → Publish, and Published → Send to Approved
 * so a mistaken publish is one tap to undo. Anything more exotic
 * (Scheduled, Archived) stays in the Post details status select.
 */
const STATUS_ACTIONS: Record<PostStatus, Array<{ to: PostStatus; label: string; primary?: boolean }>> = {
  idea: [{ to: 'draft', label: 'Move to Draft', primary: true }],
  draft: [{ to: 'approved', label: 'Approve', primary: true }],
  approved: [
    { to: 'published', label: 'Publish', primary: true },
    { to: 'draft', label: 'Back to Draft' },
  ],
  scheduled: [
    { to: 'published', label: 'Publish now', primary: true },
    { to: 'approved', label: 'Back to Approved' },
  ],
  published: [{ to: 'approved', label: 'Send to Approved', primary: true }],
  archived: [{ to: 'draft', label: 'Restore to Draft', primary: true }],
}

/** Status tabs a post row can hand over as `?from=` — Back returns there. */
const FROM_TABS = ['idea', 'draft', 'approved', 'scheduled', 'published', 'archived', 'all', 'artwork']

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [similarBanner, setSimilarBanner] = useState<SimilarPost[] | null>(null)
  const [postedAsk, setPostedAsk] = useState(false)
  const [artworkDownloadedAsk, setArtworkDownloadedAsk] = useState(false)
  const [postedError, setPostedError] = useState<string | null>(null)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null)

  const previousStatusRef = useRef<PostStatus>('draft')
  const latestRef = useRef<SavePostInput | null>(null)
  const lastSavedRef = useRef<string>('')
  const timerRef = useRef<number | undefined>(undefined)
  const hydratedForRef = useRef<string | null>(null)

  const projectId = isNew
    ? onNewProjectRoute
      ? (id ?? '')
      : (params.get('project') ?? '')
    : (post.data?.project_id ?? '')
  const postData = post.data ?? null
  const project = useProject(projectId)

  // ── where Back goes: the exact tab the post was opened from ──
  const fromTab = params.get('from')
  const editorHref = (pid: string) => (fromTab ? `/posts/${pid}?from=${fromTab}` : `/posts/${pid}`)
  const backTarget = projectId
    ? fromTab === 'artwork'
      ? `/artworks?project=${projectId}`
      : fromTab && FROM_TABS.includes(fromTab)
        ? `/projects/${projectId}?status=${fromTab}`
        : `/projects/${projectId}`
    : '/dashboard'
  const goBack = () => {
    if (fromTab) navigate(backTarget)
    else if (window.history.length > 1) navigate(-1)
    else navigate(backTarget)
  }

  const isArtworkPost = postData?.post_type === 'artwork'
  const siblings = usePosts(
    !isNew && projectId
      ? isArtworkPost
        ? { projectId, type: 'artwork' }
        : { projectId, postTypes: POST_TYPES.filter((t) => t !== 'artwork') }
      : {},
  )
  const siblingList = siblings.data ?? []
  const siblingIndex = !isNew ? siblingList.findIndex((s) => s.id === editId) : -1
  const prevPost = siblingIndex > 0 ? siblingList[siblingIndex - 1] : null
  const nextPost =
    siblingIndex >= 0 && siblingIndex < siblingList.length - 1
      ? siblingList[siblingIndex + 1]
      : null

  const goToPost = (targetId: string) => {
    const snap = latestRef.current
    if (
      snap?.postId === editId &&
      serialize(snap) !== lastSavedRef.current &&
      !window.confirm('You have unsaved changes on this post. Move to another post anyway?')
    ) {
      return
    }
    navigate(editorHref(targetId))
  }

  // ── autosave (existing drafts only): silent save + non-blocking similar banner ──
  const serialize = (snap: SavePostInput) =>
    JSON.stringify([
      snap.type,
      snap.title,
      snap.status,
      snap.category,
      snap.tagNames,
      snap.tweets,
      snap.meta ?? {},
      snap.media.map((m) => m.asset.id),
    ])

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current)
  }, [])

  const runAutosave = async () => {
    const snap = latestRef.current
    if (!snap?.postId || dupCheck || savePost.isPending) return
    if (snap.type === 'artwork') return
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
    // first emission for THIS post = pristine form state → baseline, no autosave
    const snapKey = snap.postId ?? `new:${snap.projectId}`
    if (hydratedForRef.current !== snapKey) {
      hydratedForRef.current = snapKey
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

  const statusActions = postData && !isArtworkPost ? (STATUS_ACTIONS[postData.status] ?? []) : []

  const persist = async (input: SavePostInput, check: DupCheck) => {
    const savedId = await savePost.mutateAsync({
      ...input,
      tweets: input.tweets.map((t) => t.trim()).filter(Boolean),
      contentText: check.contentText,
      contentHash: check.contentHash,
    })
    if (isNew) navigate(editorHref(savedId), { replace: true })
    else setDupCheck(null)
  }

  const handleSubmit = async (input: SavePostInput) => {
    setFormError(null)
    // Artworks: caption optional, no no-repeat gate — the image is the
    // identity. Save as one (possibly empty) anchor block so media sticks.
    if (input.type === 'artwork') {
      const caption = input.tweets.map((t) => t.trim()).filter(Boolean)[0] ?? ''
      try {
        const savedId = await savePost.mutateAsync({
          ...input,
          status: 'draft',
          tweets: [caption],
          contentText: caption,
          contentHash: caption ? await sha256Hex(caption) : '',
        })
        lastSavedRef.current = serialize({ ...input, tweets: [caption] })
        if (isNew) navigate(editorHref(savedId), { replace: true })
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to save artwork')
      }
      return
    }
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

  /** One-tap status move (Approve / Publish / Send to Approved…). */
  const changeStatus = (to: PostStatus) => {
    if (!postData) return
    setStatusNote(null)
    setPostStatus.mutate(
      { id: postData.id, status: to },
      {
        onSuccess: () => {
          setStatusNote(`Moved to ${STATUS_LABEL[to] ?? to} ✓`)
          window.setTimeout(() => setStatusNote(null), 3000)
        },
      },
    )
  }

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1500)
  }

  // What Post on X sends: the live form snapshot when it belongs to this
  // post, else the saved post.
  const shareContent = () => {
    const snap =
      latestRef.current &&
      (isNew ? !latestRef.current.postId : latestRef.current.postId === editId)
        ? latestRef.current
        : null
    const tweets = snap?.tweets?.length
      ? snap.tweets
      : (postData?.post_tweets ?? []).map((t) => t.content)
    const savedMedia = Object.values(postData?.mediaByTweet ?? {}).flat()
    const media: Asset[] = snap ? snap.media.map((m) => m.asset) : savedMedia
    return {
      text: tweets.length === 1 ? tweets[0] : numberedTweets(tweets),
      media,
    }
  }

  /** Download the artwork's first image at full size. */
  const downloadArtwork = async () => {
    const { media } = shareContent()
    const asset = media.find((a) => a.mime_type.startsWith('image/')) ?? media[0]
    if (!asset) return
    try {
      const url = await getSignedUrl(asset.r2_key)
      const blob = await (await fetch(url)).blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = asset.filename || 'artwork.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
      // Give the browser a beat to hand the file over, then ask whether
      // the gallery copy should be deleted or kept.
      window.setTimeout(() => setArtworkDownloadedAsk(true), 600)
    } catch {
      setFormError('Could not download this image.')
    }
  }

  /**
   * Send the post to X. X's intent URL carries text only, so on phones we use
   * the share sheet instead: it accepts the image files alongside the text, so
   * the picture really does travel with the words. The web intent is the
   * fallback for desktop, where the image is attached by hand.
   */
  const shareToX = async () => {
    setMenuOpen(false)
    setSharing(true)
    const { text: shareText, media: shareMedia } = shareContent()

    // ── Automatically move post to Published immediately so the user can
    // just post on X and close all apps without needing to return to PostGen.
    // The popup appears for undo in case they cancel or something went wrong.
    if (postData) {
      previousStatusRef.current = postData.status
      if (postData.status !== 'published') {
        setPostStatus.mutate(
          { id: postData.id, status: 'published' },
          {
            onSuccess: () => {
              setStatusNote('Marked as Published ✓')
              window.setTimeout(() => setStatusNote(null), 3000)
            },
          },
        )
      }
      setPostedAsk(true)
    }

    let done = false
    try {
      const files: File[] = []
      for (const asset of shareMedia.slice(0, 4)) {
        if (!asset.mime_type.startsWith('image/')) continue
        try {
          const url = await getSignedUrl(asset.r2_key)
          const blob = await (await fetch(url)).blob()
          files.push(new File([blob], asset.filename || 'image.png', { type: asset.mime_type }))
        } catch {
          /* one unreadable asset shouldn't sink the whole share */
        }
      }
      if (files.length > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
        await navigator.share({ files, text: shareText })
        done = true
      }
    } catch (err) {
      // closing the sheet is not a failure — just stop
      if ((err as DOMException | undefined)?.name === 'AbortError') done = true
    } finally {
      setSharing(false)
    }
    if (done) return
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')
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
              onClick={goBack}
              className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="pg-title truncate text-2xl text-ink">
                {isArtworkPost ? 'Edit artwork' : isNew ? 'New post' : 'Edit post'}
              </h1>
              <p className="truncate text-xs font-bold text-ink-soft">
                {isNew
                  ? 'Repeats are blocked — every save is checked.'
                  : postData
                    ? isArtworkPost
                      ? `Artwork · via ${postData.created_via}`
                      : `${postData.post_tweets.length} tweet${postData.post_tweets.length > 1 ? 's' : ''} · via ${postData.created_via}${autosavedAt ? ` · autosaved ${new Date(autosavedAt).toLocaleTimeString()}` : ''}`
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
                          if (!window.confirm(isArtworkPost ? 'Delete this artwork? This cannot be undone.' : 'Delete this post? This cannot be undone.')) return
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

        </header>

        {/* ── status bar: current state + the one-tap move for it ── */}
        {!isNew && postData && !isArtworkPost ? (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="pg-glass flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-extrabold text-ink">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: STATUS_DOT[postData.status] ?? '#a09cc4' }}
                />
                {STATUS_LABEL[postData.status] ?? postData.status}
              </span>
              {statusActions.map((a) => (
                <Button
                  key={a.to}
                  variant={a.primary ? 'accent' : 'ghost'}
                  className="flex-1 py-2.5"
                  disabled={setPostStatus.isPending}
                  onClick={() => changeStatus(a.to)}
                >
                  {setPostStatus.isPending && setPostStatus.variables?.status === a.to
                    ? 'Moving…'
                    : a.label}
                </Button>
              ))}
            </div>
            {statusNote ? (
              <p className="mt-2 text-center text-xs font-extrabold text-emerald-700">{statusNote}</p>
            ) : null}
            {setPostStatus.error ? (
              <div className="mt-2">
                <ErrorBox
                  message={
                    setPostStatus.error instanceof Error
                      ? setPostStatus.error.message
                      : 'Could not change status'
                  }
                />
              </div>
            ) : null}
          </div>
        ) : null}

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

        {/* ── one card: live preview + editor together (PostForm) ── */}
        <div className="mt-6">
          <PostForm
            key={initial.postId ?? `new:${initial.projectId}`}
            initial={initial}
            busy={savePost.isPending}
            error={formError ?? (savePost.error instanceof Error ? savePost.error.message : null)}
            blacklist={projectBlacklist(project.data?.brand_voice)}
            project={project.data}
            statusValue={postData?.status}
            onSubmit={handleSubmit}
            onCancel={() => navigate(backTarget, { replace: true })}
            onChange={onFormChange}
          />
        </div>

        {/* ── sticky action dock: the most-used actions (Post on X, Save,
              Previous/Next) stay in thumb reach at all times ── */}
        <div className="sticky bottom-3 z-30 mt-6">
          <div className="pg-glass-strong rounded-[26px] p-2 shadow-[0_18px_40px_rgba(70,60,130,0.22)]">
            {!isNew && postData ? (
              <div className="flex gap-2">
                {isArtworkPost ? (
                  <Button
                    variant="accent"
                    className="flex-1 py-3 text-[15px]"
                    onClick={() => void downloadArtwork()}
                  >
                    Download image
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    className="flex-1 py-3 text-[15px]"
                    disabled={sharing}
                    onClick={() => void shareToX()}
                  >
                    {sharing ? 'Opening…' : 'Post on X'}
                  </Button>
                )}
                <Button
                  className="flex-1 py-3 text-[15px]"
                  disabled={savePost.isPending}
                  onClick={() => {
                    if (latestRef.current) void handleSubmit(latestRef.current)
                  }}
                >
                  {savePost.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full py-3 text-[15px]"
                disabled={savePost.isPending}
                onClick={() => {
                  if (latestRef.current) void handleSubmit(latestRef.current)
                }}
              >
                {savePost.isPending ? 'Saving…' : initial.type === 'artwork' ? 'Save artwork' : 'Save post'}
              </Button>
            )}
            {!isNew && postData ? (
              <nav aria-label="Posts" className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!prevPost}
                  onClick={() => prevPost && goToPost(prevPost.id)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-ink transition hover:bg-white/60 active:scale-95 disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  ← Previous
                </button>
                <span className="shrink-0 text-xs font-extrabold text-ink-soft">
                  {siblingIndex >= 0 ? `${siblingIndex + 1} of ${siblingList.length}` : '…'}
                </span>
                <button
                  type="button"
                  disabled={!nextPost}
                  onClick={() => nextPost && goToPost(nextPost.id)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-ink transition hover:bg-white/60 active:scale-95 disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  Next →
                </button>
              </nav>
            ) : null}
          </div>
        </div>


        {artworkDownloadedAsk && postData && isArtworkPost ? (
          <div className="fixed inset-0 z-50 flex items-end bg-ink/45 px-3 pt-10 pb-6" onClick={() => setArtworkDownloadedAsk(false)}>
            <div
              className="pg-glass-strong mx-auto w-full max-w-[440px] rounded-[26px] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="pg-title text-xl text-ink">Did it download?</h2>
              <p className="mt-1.5 text-sm leading-relaxed font-semibold text-ink-soft">
                The image was sent to your device. If you have it saved, you can delete the
                gallery copy now — or keep it here.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="danger"
                  className="flex-1 py-3"
                  disabled={deletePost.isPending}
                  onClick={() => {
                    deletePost.mutate(postData.id, {
                      onSuccess: () => navigate(backTarget, { replace: true }),
                    })
                  }}
                >
                  {deletePost.isPending ? 'Deleting…' : 'Delete'}
                </Button>
                <Button variant="ghost" className="flex-1 py-3" onClick={() => setArtworkDownloadedAsk(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {postedAsk && postData ? (
          <div className="fixed inset-0 z-50 flex items-end bg-ink/45 px-3 pt-10 pb-6" onClick={() => setPostedAsk(false)}>
            <div
              className="pg-glass-strong mx-auto w-full max-w-[440px] rounded-[26px] p-5 shadow-[0_18px_40px_rgba(70,60,130,0.22)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <h2 className="pg-title text-xl text-ink">Marked as Published</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed font-semibold text-ink-soft">
                This post is automatically moved to <strong className="text-ink">Published</strong> so you don't need to reopen PostGen after posting on X. You can close all apps now.
              </p>
              <p className="mt-1 text-xs font-semibold text-ink-soft">
                If you cancelled or changed your mind on X, undo below to keep it as {STATUS_LABEL[previousStatusRef.current] ?? 'Draft'}.
              </p>
              {postedError ? (
                <div className="mt-3">
                  <ErrorBox message={postedError} />
                </div>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 py-3 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 active:scale-95"
                  disabled={setPostStatus.isPending}
                  onClick={() => {
                    setPostedError(null)
                    const revertTo = previousStatusRef.current || 'draft'
                    setPostStatus.mutate(
                      { id: postData.id, status: revertTo },
                      {
                        onSuccess: () => {
                          setStatusNote(`Reverted to ${STATUS_LABEL[revertTo] ?? revertTo} ✓`)
                          window.setTimeout(() => setStatusNote(null), 3000)
                          setPostedAsk(false)
                        },
                        onError: (e) =>
                          setPostedError(e instanceof Error ? e.message : 'Could not undo publish status'),
                      },
                    )
                  }}
                >
                  {setPostStatus.isPending ? 'Undoing…' : 'Undo to Draft'}
                </Button>
                <Button
                  variant="accent"
                  className="flex-1 py-3"
                  onClick={() => setPostedAsk(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {shareOpen && postData ? (
          <ShareDialog
            targets={[
              {
                itemType: 'post',
                itemId: postData.id,
                title: postData.title || postData.post_tweets[0]?.content?.slice(0, 60) || 'Untitled post',
              },
            ]}
            onClose={() => setShareOpen(false)}
          />
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
