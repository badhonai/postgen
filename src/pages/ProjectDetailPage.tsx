import { useDeferredValue, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { exportProject, importBundle, parseImportJson } from '../lib/export'
import { findExactDuplicate } from '../lib/dedupe'
import {
  useDeleteProject,
  useProject,
  useUpdateProject,
  type ProjectInput,
} from '../features/projects/api'
import ProjectForm from '../features/projects/ProjectForm'
import PostCard from '../features/posts/PostCard'
import MediaLibrary from '../features/media/MediaLibrary'
import { usePosts, useSavePost, type PostFilters } from '../features/posts/api'
import { CATEGORY_LABELS, type PostCategory, type PostStatus } from '../lib/types'
import { Button, Card, ErrorBox, Input, Select, Skeleton, Spinner } from '../components/ui'

const STATUSES: Array<PostStatus | ''> = ['', 'idea', 'draft', 'approved', 'scheduled', 'published', 'archived']
const CATEGORIES: Array<PostCategory | ''> = ['', ...(Object.keys(CATEGORY_LABELS) as PostCategory[])]

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const project = useProject(id)
  const updateProject = useUpdateProject(id)
  const deleteProject = useDeleteProject()
  const savePost = useSavePost()
  const [editing, setEditing] = useState(false)
  const [busyTransfer, setBusyTransfer] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PostStatus | ''>('')
  const [category, setCategory] = useState<PostCategory | ''>('')
  const [tag, setTag] = useState('')

  const filters: PostFilters = {
    projectId: id,
    search: useDeferredValue(search) || undefined,
    status,
    category,
    tag: tag || undefined,
  }
  const posts = usePosts(filters)

  if (project.isPending) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Spinner />
      </main>
    )
  }

  if (project.error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <ErrorBox
          message={project.error instanceof Error ? project.error.message : 'Failed to load project'}
        />
      </main>
    )
  }

  if (!project.data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    )
  }

  const p = project.data

  const handleUpdate = (input: ProjectInput) => {
    updateProject.mutate(input, {
      onSuccess: () => setEditing(false),
    })
  }

  const handleDelete = () => {
    if (!window.confirm(`Delete “${p.name}” and everything in it? This cannot be undone.`)) return
    deleteProject.mutate(p.id, {
      onSuccess: () => navigate('/dashboard', { replace: true }),
    })
  }

  const handleExport = async (format: 'json' | 'md') => {
    setBusyTransfer(true)
    try {
      await exportProject(p.id, p.slug, format)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'export failed')
    } finally {
      setBusyTransfer(false)
    }
  }

  const handleImport = async (file: File) => {
    setBusyTransfer(true)
    try {
      const bundle = parseImportJson(await file.text())
      const result = await importBundle(
        bundle,
        p.id,
        (input) => savePost.mutateAsync(input),
        async (hash) => (await findExactDuplicate(hash)) !== null,
      )
      void posts.refetch()
      window.alert(
        `Imported ${result.imported} post${result.imported === 1 ? '' : 's'}` +
          (result.skippedDuplicates ? `, skipped ${result.skippedDuplicates} exact duplicate${result.skippedDuplicates === 1 ? '' : 's'}` : '') +
          (result.failed ? `, failed ${result.failed}` : ''),
      )
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'import failed')
    } finally {
      setBusyTransfer(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link to="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Projects
      </Link>

      <header className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            slug: <code className="text-zinc-400">{p.slug}</code> · created{' '}
            {new Date(p.created_at).toLocaleDateString()}
          </p>
        </div>
        {!editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        ) : null}
      </header>

      <div className="mt-8">
        {editing ? (
          <Card>
            <ProjectForm
              initial={p}
              busy={updateProject.isPending}
              error={updateProject.error instanceof Error ? updateProject.error.message : null}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(false)}
            />
          </Card>
        ) : (
          <Card>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">About</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
              {p.description || 'No description yet.'}
            </p>

            <h2 className="mt-8 text-sm font-semibold tracking-wide text-zinc-300 uppercase">
              Brand voice
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-zinc-500">Tone</dt>
                <dd className="text-zinc-300">{p.brand_voice.tone || '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-zinc-500">Emoji policy</dt>
                <dd className="text-zinc-300">{p.brand_voice.emojiPolicy || '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-zinc-500">Taboo words</dt>
                <dd className="text-zinc-300">{(p.brand_voice.tabooWords ?? []).join(', ') || '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-zinc-500">Hashtags</dt>
                <dd className="text-zinc-300">
                  {(p.brand_voice.hashtags ?? []).map((h) => `#${h}`).join(' ') || '—'}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-zinc-500">CTA style</dt>
                <dd className="text-zinc-300">{p.brand_voice.ctaStyle || '—'}</dd>
              </div>
            </dl>
          </Card>
        )}
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Posts</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={busyTransfer} onClick={() => void handleExport('md')}>
              {busyTransfer ? '…' : 'Export .md'}
            </Button>
            <Button variant="ghost" disabled={busyTransfer} onClick={() => void handleExport('json')}>
              Export .json
            </Button>
            <Button variant="ghost" disabled={busyTransfer} onClick={() => importInputRef.current?.click()}>
              Import
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImport(file)
              }}
            />
            <Link to={`/projects/${p.id}/posts/new`}>
              <Button>+ New post</Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="w-56"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value as PostStatus | '')} className="w-36">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || 'Any status'}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as PostCategory | '')}
            className="w-40"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c ? CATEGORY_LABELS[c] : 'Any category'}
              </option>
            ))}
          </Select>
          {tag ? (
            <Button variant="ghost" onClick={() => setTag('')}>
              #{tag} ✕
            </Button>
          ) : null}
        </div>

        <div className="mt-4">
          {posts.isPending ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : posts.error ? (
            <ErrorBox
              message={posts.error instanceof Error ? posts.error.message : 'Failed to load posts'}
            />
          ) : (posts.data ?? []).length === 0 ? (
            <Card className="border-dashed text-center">
              <h3 className="font-semibold text-zinc-200">No posts yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                Write your first post — a single tweet or a full thread. Duplicates are
                blocked automatically.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {(posts.data ?? []).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-10">
        <MediaLibrary projectId={p.id} />
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        {(
          [
            ['Knowledge & AI agents', 'M4'],
          ] as const
        ).map(([label, milestone]) => (
          <span
            key={label}
            className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500"
            title={`Arrives in milestone ${milestone}`}
          >
            {label} · {milestone}
          </span>
        ))}
      </div>
    </main>
  )
}
