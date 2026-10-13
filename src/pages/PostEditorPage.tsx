import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { checkDuplicates, hasBlockingDuplicates, type DupCheck, type SimilarPost } from '../lib/dedupe'
import { projectBlacklist } from '../lib/blacklist'
import { numberedTweets } from '../lib/text'
import {
  useDeletePost,
  usePost,
  useSavePost,
  type SavePostInput,
} from '../features/posts/api'
import { useProject } from '../features/projects/api'
import PostForm from '../features/posts/PostForm'
import DuplicateDialog from '../features/posts/DuplicateDialog'
import { Button, ErrorBox, Spinner } from '../components/ui'

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

  const [dupCheck, setDupCheck] = useState<DupCheck | null>(null)
  const [pendingInput, setPendingInput] = useState<SavePostInput | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [similarBanner, setSimilarBanner] = useState<SimilarPost[] | null>(null)
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
        }
      : projectId
        ? {
            postId: undefined,
            projectId,
            category: 'promotional',
            status: 'draft',
            title: '',
            tweets: [''],
            tagNames: [],
            contentText: '',
            contentHash: '',
            media: [],
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

  return (
    <main className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-16">
        {/* ── header ── */}
        <header className="flex items-center gap-3">
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
            <>
              <Button
                variant="ghost"
                className="px-3.5 py-2 text-xs"
                onClick={() =>
                  void copy(
                    postData.post_tweets.length === 1
                      ? postData.post_tweets[0].content
                      : numberedTweets(postData.post_tweets.map((t) => t.content)),
                    'copy',
                  )
                }
              >
                {copied === 'copy' ? 'Copied ✓' : 'Copy'}
              </Button>
              <Button
                variant="danger"
                className="px-3.5 py-2 text-xs"
                disabled={deletePost.isPending}
                onClick={() => {
                  if (!window.confirm('Delete this post? This cannot be undone.')) return
                  deletePost.mutate(postData.id, {
                    onSuccess: () =>
                      navigate(projectId ? `/projects/${projectId}` : '/dashboard', {
                        replace: true,
                      }),
                  })
                }}
              >
                Delete
              </Button>
            </>
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
