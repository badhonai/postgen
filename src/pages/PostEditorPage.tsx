import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { checkDuplicates, hasBlockingDuplicates, type DupCheck } from '../lib/dedupe'
import { numberedTweets } from '../lib/text'
import {
  useDeletePost,
  usePost,
  useSavePost,
  type SavePostInput,
} from '../features/posts/api'
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

  const projectId = isNew ? (params.get('project') ?? '') : (post.data?.project_id ?? '')
  const postData = post.data ?? null

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
        </p>
      ) : null}

      <Card className="mt-8">
        <PostForm
          initial={initial}
          busy={savePost.isPending}
          error={formError ?? (savePost.error instanceof Error ? savePost.error.message : null)}
          onSubmit={handleSubmit}
          onCancel={() =>
            navigate(projectId ? `/projects/${projectId}` : '/dashboard', { replace: true })
          }
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
