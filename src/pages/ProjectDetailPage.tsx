import { useDeferredValue, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { exportProject, importBundle, parseImportJson } from '../lib/export'
import { findExactDuplicate } from '../lib/dedupe'
import { projectBlacklist } from '../lib/blacklist'
import { useAssetUrl } from '../lib/media'
import { STATUS_DOT, STATUS_LABEL, CATEGORY_LABELS, type PostCategory, type PostStatus } from '../lib/types'
import type { PostListItem } from '../features/posts/api'
import {
  applyNewAssets,
  useDeleteProject,
  useProject,
  useUpdateProject,
  type ProjectInput,
} from '../features/projects/api'
import ProjectForm from '../features/projects/ProjectForm'
import MediaLibrary from '../features/media/MediaLibrary'
import { usePosts, useSavePost, type PostFilters } from '../features/posts/api'
import { Button, ErrorBox, Input, Select, Skeleton, Spinner } from '../components/ui'

const STATUSES: Array<PostStatus | ''> = ['', 'idea', 'draft', 'approved', 'scheduled', 'published', 'archived']
const CATEGORIES: Array<PostCategory | ''> = ['', ...(Object.keys(CATEGORY_LABELS) as PostCategory[])]

type Tab = 'about' | 'posts' | 'media'

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const project = useProject(id)
  const updateProject = useUpdateProject(id)
  const deleteProject = useDeleteProject()
  const savePost = useSavePost()
  const [tab, setTab] = useState<Tab>('about')
  const [editing, setEditing] = useState(false)
  const [busyTransfer, setBusyTransfer] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PostStatus | ''>('')
  const [category, setCategory] = useState<PostCategory | ''>('')

  const filters: PostFilters = {
    projectId: id,
    search: useDeferredValue(search) || undefined,
    status,
    category,
  }
  const posts = usePosts(filters)

  if (project.isPending) {
    return (
      <div className="pg-shell">
        <div className="mx-auto max-w-[440px] px-5 pt-10">
          <Spinner />
        </div>
      </div>
    )
  }

  if (project.error) {
    return (
      <div className="pg-shell">
        <div className="mx-auto max-w-[440px] px-5 pt-10">
          <ErrorBox
            message={project.error instanceof Error ? project.error.message : 'Failed to load project'}
          />
        </div>
      </div>
    )
  }

  if (!project.data) {
    return (
      <div className="pg-shell">
        <div className="mx-auto max-w-[440px] px-5 pt-10">
          <h1 className="pg-title text-2xl text-ink">Project not found</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-bold text-ink underline underline-offset-2">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const p = project.data

  const handleUpdate = (input: ProjectInput) => {
    updateProject.mutate(input, {
      onSuccess: () => {
        setEditing(false)
        void applyNewAssets(p.id, input).catch((err: unknown) =>
          window.alert(err instanceof Error ? err.message : 'asset upload failed'),
        )
      },
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
    <div className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-32">
        {/* ── header ── */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/dashboard')}
            className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <ProjectLogo r2Key={p.logo?.r2_key} />
          <div className="min-w-0 flex-1">
            <h1 className="pg-title truncate text-2xl text-ink">{p.name}</h1>
            {p.x_username ? (
              <p className="truncate text-xs font-bold text-ink-soft">@{p.x_username}</p>
            ) : (
              <p className="truncate text-xs font-bold text-ink-soft">{p.slug}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Edit project"
            onClick={() => setEditing(true)}
            className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
        </header>

        {/* ── tabs ── */}
        <div className="pg-scroll mt-5 flex gap-2 overflow-x-auto pb-1">
          {([['about', 'About'], ['posts', 'Posts'], ['media', 'Media']] as Array<[Tab, string]>).map(
            ([id2, label]) => (
              <button
                key={id2}
                type="button"
                className={`pg-chip ${tab === id2 ? 'pg-chip-active' : ''}`}
                onClick={() => setTab(id2)}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {/* ── About ── */}
        {tab === 'about' ? (
          <div className="mt-5 space-y-3.5">
            <section className="pg-glass rounded-[24px] p-5">
              <h2 className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">About</h2>
              <p className="mt-2.5 text-[14px] leading-relaxed font-semibold whitespace-pre-wrap text-ink">
                {p.description || 'No description yet.'}
              </p>
              {(p.content_pillars ?? []).length > 0 ? (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {p.content_pillars.map((c) => (
                    <span key={c} className="rounded-full bg-mint/70 px-2.5 py-1 text-[11px] font-bold text-ink">
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="pg-glass rounded-[24px] p-5">
              <h2 className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Brand voice</h2>
              <div className="mt-2.5 space-y-2 text-[14px] font-semibold text-ink">
                <p>
                  <span className="text-ink-soft">Tone & voice — </span>
                  {p.brand_voice.tone || '—'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-ink-soft">Blacklist —</span>
                  {projectBlacklist(p.brand_voice).length ? (
                    projectBlacklist(p.brand_voice).map((w) => (
                      <span key={w} className="rounded-full bg-rose-soft/70 px-2.5 py-0.5 text-[11px] font-bold text-ink">
                        {w}
                      </span>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            </section>

            <section className="pg-glass rounded-[24px] p-5">
              <h2 className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Official links</h2>
              <ul className="mt-2.5 space-y-1.5 text-[14px] font-semibold">
                {p.website_url ? (
                  <li className="flex items-center gap-2.5">
                    <LinkChip label="Website" />
                    <a href={p.website_url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-ink underline underline-offset-2">
                      {p.website_url}
                    </a>
                  </li>
                ) : null}
                {(p.official_links ?? []).map((l) => (
                  <li key={l.url} className="flex items-center gap-2.5">
                    <LinkChip label={l.label} />
                    <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-ink underline underline-offset-2">
                      {l.url}
                    </a>
                  </li>
                ))}
                {!p.website_url && (p.official_links ?? []).length === 0 ? (
                  <li className="text-ink-soft">—</li>
                ) : null}
              </ul>
            </section>

            {(p.sample_posts ?? []).length > 0 ? (
              <section className="pg-glass rounded-[24px] p-5">
                <h2 className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Sample posts</h2>
                <div className="mt-2.5 space-y-2.5">
                  {p.sample_posts.map((s, i) => (
                    <blockquote key={i} className="rounded-[16px] bg-white/45 px-4 py-3 text-[13px] leading-relaxed font-semibold text-ink">
                      “{s}”
                    </blockquote>
                  ))}
                </div>
              </section>
            ) : null}

            {p.custom_instructions ? (
              <section className="pg-glass rounded-[24px] p-5">
                <h2 className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Custom instructions</h2>
                <p className="mt-2.5 text-[14px] leading-relaxed font-semibold whitespace-pre-wrap text-ink">
                  {p.custom_instructions}
                </p>
              </section>
            ) : null}
          </div>
        ) : null}

        {/* ── Posts ── */}
        {tab === 'posts' ? (
          <div className="mt-5 space-y-3.5">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="flex-1"
              />
              <Select value={category} onChange={(e) => setCategory(e.target.value as PostCategory | '')} className="w-32">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c ? CATEGORY_LABELS[c] : 'Category'}
                  </option>
                ))}
              </Select>
            </div>

            <div className="pg-scroll flex gap-2 overflow-x-auto pb-1">
              {STATUSES.map((s) => (
                <button
                  key={s || 'any'}
                  type="button"
                  className={`pg-chip text-xs ${status === s ? 'pg-chip-active' : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {s ? STATUS_LABEL[s] : 'Any status'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" className="px-3.5 py-1.5 text-xs" disabled={busyTransfer} onClick={() => void handleExport('md')}>
                Export .md
              </Button>
              <Button variant="ghost" className="px-3.5 py-1.5 text-xs" disabled={busyTransfer} onClick={() => void handleExport('json')}>
                Export .json
              </Button>
              <Button variant="ghost" className="px-3.5 py-1.5 text-xs" disabled={busyTransfer} onClick={() => importInputRef.current?.click()}>
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
            </div>

            {posts.isPending ? (
              <div className="space-y-2.5">
                <Skeleton className="h-16 w-full rounded-[20px]" />
                <Skeleton className="h-16 w-full rounded-[20px]" />
                <Skeleton className="h-16 w-full rounded-[20px]" />
              </div>
            ) : posts.error ? (
              <ErrorBox message={posts.error instanceof Error ? posts.error.message : 'Failed to load posts'} />
            ) : (posts.data ?? []).length === 0 ? (
              <div className="pg-glass rounded-[24px] p-7 text-center">
                <p className="text-sm font-semibold text-ink-soft">
                  {search || status || category ? 'No posts match these filters.' : 'No posts yet.'}
                </p>
                {!search && !status && !category ? (
                  <Button className="mt-4" onClick={() => navigate(`/projects/${p.id}/posts/new`)}>
                    + New post
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2.5">
                {(posts.data ?? []).map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Media ── */}
        {tab === 'media' ? (
          <div className="mt-5">
            <MediaLibrary projectId={p.id} />
          </div>
        ) : null}
      </div>

      {/* ── floating new post ── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(env(safe-area-inset-bottom),18px)]">
        <Button
          className="pg-fab pointer-events-auto"
          onClick={() => navigate(`/projects/${p.id}/posts/new`)}
        >
          + New post
        </Button>
      </div>

      {/* ── edit sheet ── */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-sm">
          <div className="pg-glass-strong max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[32px] p-6 pb-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="pg-title text-2xl text-ink">Edit project</h2>
              <button
                type="button"
                aria-label="Close"
                className="pg-glass flex h-10 w-10 items-center justify-center rounded-full text-ink"
                onClick={() => setEditing(false)}
              >
                ✕
              </button>
            </div>
            <ProjectForm
              initial={p}
              busy={updateProject.isPending}
              error={updateProject.error instanceof Error ? updateProject.error.message : null}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(false)}
            />
            <div className="mt-8 border-t border-white/50 pt-5">
              <Button variant="danger" onClick={handleDelete} disabled={deleteProject.isPending}>
                {deleteProject.isPending ? 'Deleting…' : 'Delete project'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PostRow({ post }: { post: PostListItem }) {
  return (
    <Link
      to={`/posts/${post.id}`}
      className="pg-glass flex items-center gap-3 rounded-[20px] px-4 py-3.5 transition active:scale-[0.98]"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: STATUS_DOT[post.status] ?? '#a09cc4' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-ink">
          {post.title || post.content_text.slice(0, 70) || 'Untitled post'}
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-ink-soft">
          {CATEGORY_LABELS[post.category]} · {STATUS_LABEL[post.status] ?? post.status} · via {post.created_via}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-soft">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  )
}

function LinkChip({ label }: { label: string }) {
  return (
    <span className="w-24 shrink-0 truncate rounded-full bg-lilac/70 px-2.5 py-1 text-center text-[11px] font-bold text-ink">
      {label}
    </span>
  )
}

function ProjectLogo({ r2Key }: { r2Key: string | null | undefined }) {
  const url = useAssetUrl(r2Key)
  if (!url.data) {
    return (
      <div className="pg-glass flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-lg text-ink-soft">
        ✦
      </div>
    )
  }
  return (
    <img
      src={url.data}
      alt=""
      className="h-12 w-12 shrink-0 rounded-[18px] object-cover ring-1 ring-white/70"
    />
  )
}
