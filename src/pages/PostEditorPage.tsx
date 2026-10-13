import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { Button, Card, ErrorBox, Spinner } from '../components/ui'

export default function PostEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id

  const post = usePost(id ?? '')
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

  const projectId = isNew ? (params.get('project') ?? '') : (post.data?.project_id ?? '')
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
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Spinner />
      </main>
    )
  }

  if (!isNew && post.error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <ErrorBox message={post.error instanceof Error ? post.error.message : 'Failed to load post'} />
      </main>
    )
  }

  if (!isNew && !post.data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold">Post not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          ← Back to dashboard
        </Link>
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
      <main className="mx-auto max-w-3xl px-6 py-10">
        <ErrorBox message="Missing project — create this post from a project page." />
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
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link
        to={projectId ? `/projects/${projectId}` : '/dashboard'}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← {isNew ? 'Project' : 'Project'}
      </Link>

      <header className="mt-2 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {isNew ? 'New post' : 'Edit post'}
        </h1>
        <div className="flex gap-2">
          {!isNew && postData ? (
            <>
              <Button
                variant="ghost"
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
        </div>
      </header>

      {isNew ? (
        <p className="mt-1 text-sm text-zinc-500">
          Saved posts are checked against your existing posts — repeats are blocked.
        </p>
      ) : postData ? (
        <p className="mt-1 text-sm text-zinc-500">
          {postData.post_tweets.length} tweet{postData.post_tweets.length > 1 ? 's' : ''} ·
          created via {postData.created_via} ·{' '}
          {new Date(postData.created_at).toLocaleString()}
          {autosavedAt ? ` · autosaved ${new Date(autosavedAt).toLocaleTimeString()}` : ''}
        </p>
      ) : null}

      {similarBanner ? (
        <div className="mt-6 flex items-start justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <p>
            ⚠️ This draft is very similar to{' '}
            {similarBanner.slice(0, 2).map((s, i) => (
              <span key={s.id}>
                {i > 0 ? ' and ' : ''}
                <Link to={`/posts/${s.id}`} className="font-medium underline hover:text-amber-200">
                  {s.title || 'an untitled post'}
                </Link>{' '}
                ({Math.round(s.similarity * 100)}%)
              </span>
            ))}
            . Autosaved anyway — edit one of them to avoid a repeat.
          </p>
          <button
            type="button"
            className="shrink-0 text-amber-400 hover:text-amber-200"
            onClick={() => setSimilarBanner(null)}
          >
            ✕
          </button>
        </div>
      ) : null}

      <Card className="mt-6">
        <PostForm
          initial={initial}
          busy={savePost.isPending}
          error={formError ?? (savePost.error instanceof Error ? savePost.error.message : null)}
          blacklist={projectBlacklist(project.data?.brand_voice)}
          onSubmit={handleSubmit}
          onCancel={() =>
            navigate(projectId ? `/projects/${projectId}` : '/dashboard', { replace: true })
          }
          onChange={onFormChange}
        />
      </Card>

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
    </main>
  )
}
