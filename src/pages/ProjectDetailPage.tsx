import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { exportProject, importBundle, parseImportJson } from '../lib/export'
import { findExactDuplicate } from '../lib/dedupe'
import { projectBlacklist } from '../lib/blacklist'
import { useAssetUrl } from '../lib/media'
import {
  STATUS_DOT,
  STATUS_LABEL,
  CATEGORY_LABELS,
  POST_TYPES,
  POST_TYPE_LABEL,
  type PostCategory,
  type PostStatus,
  type PostType,
} from '../lib/types'
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
import {
  useBulkDeletePosts,
  useBulkSetStatus,
  usePosts,
  useSavePost,
  type PostFilters,
} from '../features/posts/api'
import SwipeRow, { type SwipeAction } from '../features/posts/SwipeRow'
import ShareDialog from '../features/shares/ShareDialog'
import { Button, ErrorBox, Input, Select, Skeleton, Spinner } from '../components/ui'
import { cn } from '../lib/cn'

const CATEGORIES: Array<PostCategory | ''> = ['', ...(Object.keys(CATEGORY_LABELS) as PostCategory[])]

/**
 * Status tabs across the top of the posts list. Approved leads on purpose:
 * the common flow is open a project, pick an approved post, and send it out,
 * so that is the tab a project opens on.
 */
const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'published', label: 'Published' },
] as const
type StatusTab = (typeof STATUS_TABS)[number]['id']

const DEFAULT_STATUS_TAB: StatusTab = 'approved'
const isStatusTab = (v: string | null): v is StatusTab => STATUS_TABS.some((t) => t.id === v)

function SectionTitle({ icon, title, tint }: { icon: ReactNode; title: string; tint: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${tint}`}>{icon}</span>
      <h2 className="pg-title text-[17px] text-ink">{title}</h2>
    </div>
  )
}

const ICON_STROKE = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

type Tab = 'about' | 'posts' | 'media'

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const project = useProject(id)
  const updateProject = useUpdateProject(id)
  const deleteProject = useDeleteProject()
  const savePost = useSavePost()
  const [tab, setTab] = useState<Tab>('posts')
  const [editing, setEditing] = useState(false)
  const [busyTransfer, setBusyTransfer] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [params, setParams] = useSearchParams()
  const statusTab: StatusTab = isStatusTab(params.get('status')) ? (params.get('status') as StatusTab) : DEFAULT_STATUS_TAB
  const setStatusTab = (next: StatusTab) => {
    const q = new URLSearchParams(params)
    if (next === DEFAULT_STATUS_TAB) q.delete('status')
    else q.set('status', next)
    setParams(q, { replace: true })
  }
  const [category, setCategory] = useState<PostCategory | ''>('')
  const [type, setType] = useState<PostType | ''>('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const bulkStatus = useBulkSetStatus()
  const bulkDelete = useBulkDeletePosts()

  const filters: PostFilters = {
    projectId: id,
    search: useDeferredValue(search) || undefined,
    status: statusTab === 'all' ? '' : statusTab,
    category,
    type,
  }
  const posts = usePosts(filters)

  const visiblePosts = posts.data ?? []
  const visibleIds = visiblePosts.map((p) => p.id)
  const selectedPosts = visiblePosts.filter((p) => selected.has(p.id))
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  /** how many selected posts each action would actually change */
  const approveCount = selectedPosts.filter((p) => p.status !== 'approved').length
  const publishCount = selectedPosts.filter((p) => p.status !== 'published').length
  const busyBulk = bulkStatus.isPending || bulkDelete.isPending
  const bulkError = bulkStatus.error ?? bulkDelete.error

  // keep the "N selected" count truthful: drop ids that left the current list
  const visibleKey = visibleIds.join(',')
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const next = new Set([...prev].filter((id) => visibleIds.includes(id)))
      return next.size === prev.size ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey])

  const toggleOne = (postId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })

  const runBulkStatus = async (status: PostStatus) => {
    const targets = selectedPosts.filter((p) => p.status !== status)
    if (targets.length === 0) return
    try {
      await bulkStatus.mutateAsync({ posts: targets, status })
      // the selection is deliberately kept: approving a batch and then
      // publishing the same batch should not need a second round of tapping.
      // Rows that a status filter now hides prune themselves out.
    } catch {
      /* surfaced via bulkError */
    }
  }

  /** One post forward through the workflow: idea/draft → approved → published. */
  const nextStatus = (status: PostStatus): PostStatus | undefined =>
    status === 'idea' || status === 'draft' ? 'approved' : status === 'approved' ? 'published' : undefined

  const runSwipeNext = async (post: PostListItem) => {
    const next = nextStatus(post.status)
    if (!next) return
    try {
      await bulkStatus.mutateAsync({ posts: [post], status: next })
    } catch {
      /* surfaced via bulkError */
    }
  }

  const runSwipeDelete = async (post: PostListItem) => {
    const label = post.title || post.content_text.slice(0, 70) || 'Untitled post'
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    try {
      await bulkDelete.mutateAsync([post.id])
    } catch {
      /* surfaced via bulkError */
    }
  }

  const runBulkDelete = async () => {
    if (selectedPosts.length === 0) return
    const n = selectedPosts.length
    if (!window.confirm(`Delete ${n} post${n === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await bulkDelete.mutateAsync(selectedPosts.map((p) => p.id))
      setSelected(new Set())
    } catch {
      /* surfaced via bulkError */
    }
  }

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
        <div className="pg-glass mt-5 flex gap-1 rounded-full p-1.5">
          {([['posts', 'Posts'], ['media', 'Media'], ['about', 'About']] as Array<[Tab, string]>).map(
            ([id2, label]) => (
              <button
                key={id2}
                type="button"
                className={`flex-1 rounded-full px-1 py-2 text-[13px] font-extrabold transition ${
                  tab === id2
                    ? 'bg-butter text-ink shadow-[0_2px_10px_rgba(251,193,60,0.45)]'
                    : 'text-ink-soft'
                }`}
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
              <SectionTitle
                tint="bg-sky/60"
                icon={
                  <svg {...ICON_STROKE}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                }
                title="About"
              />
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
              <SectionTitle
                tint="bg-lilac/70"
                icon={
                  <svg {...ICON_STROKE}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
                title="Brand voice"
              />
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
              <SectionTitle
                tint="bg-mint/70"
                icon={
                  <svg {...ICON_STROKE}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                }
                title="Official links"
              />
              <ul className="mt-2.5 space-y-1.5">
                {p.website_url ? (
                  <LinkRow label="Website" url={p.website_url} />
                ) : null}
                {(p.official_links ?? []).map((l) => (
                  <LinkRow key={l.url} label={l.label} url={l.url} />
                ))}
                {!p.website_url && (p.official_links ?? []).length === 0 ? (
                  <li className="text-sm font-semibold text-ink-soft">—</li>
                ) : null}
              </ul>
            </section>

            {(p.sample_posts ?? []).length > 0 ? (
              <section className="pg-glass rounded-[24px] p-5">
                <SectionTitle
                  tint="bg-peach/70"
                  icon={
                    <svg {...ICON_STROKE}>
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                    </svg>
                  }
                  title="Sample posts"
                />
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
                <SectionTitle
                  tint="bg-butter/70"
                  icon={
                    <svg {...ICON_STROKE}>
                      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                    </svg>
                  }
                  title="Custom instructions"
                />
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
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                aria-pressed={selectMode}
                onClick={() => {
                  setSelectMode((v) => !v)
                  setSelected(new Set())
                  setMenuOpen(false)
                }}
                className={cn(
                  'flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-[13px] font-bold text-ink transition active:scale-95',
                  selectMode
                    ? 'bg-butter shadow-[0_8px_20px_rgba(242,193,78,0.45)]'
                    : 'pg-glass-strong',
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="5.5" />
                  <path d="M8.2 12.4l2.6 2.6 5-5.4" />
                </svg>
                {selectMode ? 'Done' : 'Select'}
              </button>
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Post actions"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="pg-glass-strong flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-ink transition active:scale-95"
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
                    <div className="pg-glass-strong absolute right-0 z-40 mt-2 w-46 overflow-hidden rounded-2xl p-1.5 shadow-[0_18px_40px_rgba(70,60,130,0.22)]">
                      <button
                        type="button"
                        disabled={busyTransfer}
                        onClick={() => {
                          setMenuOpen(false)
                          void handleExport('md')
                        }}
                        className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-white/70 disabled:opacity-50"
                      >
                        Export .md
                      </button>
                      <button
                        type="button"
                        disabled={busyTransfer}
                        onClick={() => {
                          setMenuOpen(false)
                          void handleExport('json')
                        }}
                        className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-white/70 disabled:opacity-50"
                      >
                        Export .json
                      </button>
                      <button
                        type="button"
                        disabled={busyTransfer}
                        onClick={() => {
                          setMenuOpen(false)
                          importInputRef.current?.click()
                        }}
                        className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-white/70 disabled:opacity-50"
                      >
                        Import
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Post status"
              className="pg-glass flex gap-1 rounded-full p-1"
            >
              {STATUS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={statusTab === t.id}
                  onClick={() => setStatusTab(t.id)}
                  className={`flex-1 rounded-full px-1 py-2 text-[13px] font-extrabold transition ${
                    statusTab === t.id
                      ? 'bg-butter text-ink shadow-[0_2px_10px_rgba(251,193,60,0.45)]'
                      : 'text-ink-soft'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Select value={category} onChange={(e) => setCategory(e.target.value as PostCategory | '')}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c ? CATEGORY_LABELS[c] : 'Category'}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0 flex-1">
                <Select value={type} onChange={(e) => setType(e.target.value as PostType | '')}>
                  {(['', ...POST_TYPES] as Array<PostType | ''>).map((t) => (
                    <option key={t || 'any'} value={t}>
                      {t ? POST_TYPE_LABEL[t] : 'Any type'}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* ── bulk actions (shown once posts are selected) ── */}
            {selectMode ? (
              <div className="pg-glass-strong space-y-2.5 rounded-[22px] p-3">
                <div className="flex items-center gap-2">
                  <span className="pl-1 text-[13px] font-extrabold text-ink">
                    {selectedPosts.length > 0 ? `${selectedPosts.length} selected` : 'Tap posts to select'}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={allVisibleSelected ? 'Deselect all posts' : 'Select all posts'}
                      onClick={() => setSelected(allVisibleSelected ? new Set<string>() : new Set(visibleIds))}
                      className="rounded-full border border-white/75 bg-white/55 px-3 py-1.5 text-[12px] font-bold text-ink transition hover:bg-white/75 active:scale-95"
                    >
                      {allVisibleSelected ? 'None' : 'All'}
                    </button>
                    <button
                      type="button"
                      aria-label="Clear selection"
                      onClick={() => setSelected(new Set())}
                      disabled={selectedPosts.length === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/75 bg-white/55 text-ink transition hover:bg-white/75 active:scale-95"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyBulk || approveCount === 0}
                    onClick={() => void runBulkStatus('approved')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-2 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {busyBulk && bulkStatus.variables?.status === 'approved' ? <Spinner /> : null}
                    {approveCount > 0 ? `Approve ${approveCount}` : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={busyBulk || publishCount === 0}
                    onClick={() => void runBulkStatus('published')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-butter px-2 py-2.5 text-[13px] font-bold text-ink shadow-[0_10px_24px_rgba(242,193,78,0.42)] transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {busyBulk && bulkStatus.variables?.status === 'published' ? <Spinner /> : null}
                    {publishCount > 0 ? `Publish ${publishCount}` : 'Publish'}
                  </button>
                  <button
                    type="button"
                    disabled={busyBulk || selectedPosts.length === 0}
                    onClick={() => void runBulkDelete()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-rose-300/70 bg-rose-soft/60 px-2 py-2.5 text-[13px] font-bold text-rose-700 transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {bulkDelete.isPending ? <Spinner /> : null}
                    {`Delete ${selectedPosts.length}`}
                  </button>
                </div>
                {bulkError ? (
                  <p className="px-1 text-[12px] font-bold text-rose-700">
                    {bulkError instanceof Error ? bulkError.message : 'Bulk action failed'}
                  </p>
                ) : null}
              </div>
            ) : null}

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

            {shareOpen ? (
              <ShareDialog
                target={{ itemType: 'project', itemId: p.id, title: p.name }}
                onClose={() => setShareOpen(false)}
              />
            ) : null}

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
                  {search || statusTab !== 'all' || category || type ? 'No posts match these filters.' : 'No posts yet.'}
                </p>
                {!search && statusTab === 'all' && !category && !type ? (
                  <Button className="mt-4" onClick={() => navigate(`/projects/${p.id}/posts/new`)}>
                    + New post
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2.5">
                {(posts.data ?? []).map((post) => {
                  const next = nextStatus(post.status)
                  return (
                    <PostRow
                      key={post.id}
                      post={post}
                      logo={p.logo}
                      selectMode={selectMode}
                      selected={selected.has(post.id)}
                      onToggle={() => toggleOne(post.id)}
                      swipeLeft={
                        next
                          ? {
                              label: STATUS_LABEL[next],
                              tone: next === 'approved' ? 'approve' : 'publish',
                              onRun: () => void runSwipeNext(post),
                            }
                          : undefined
                      }
                      swipeRight={{ label: 'Delete', tone: 'delete', onRun: () => void runSwipeDelete(post) }}
                    />
                  )
                })}
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
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#e6e2f8] via-[#e6e2f8]/80 to-transparent pt-8 pb-[max(env(safe-area-inset-bottom),14px)]">
        <div className="mx-auto flex max-w-[440px] px-5">
          <Button
            className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-extrabold"
            onClick={() => navigate(`/projects/${p.id}/posts/new`)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New post
          </Button>
        </div>
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

function PostCheck({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border transition',
        checked ? 'border-ink bg-ink text-white' : 'border-white/80 bg-white/60 text-transparent',
      )}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

function PostRow({
  post,
  logo,
  selectMode,
  selected,
  onToggle,
  swipeLeft,
  swipeRight,
}: {
  post: PostListItem
  logo?: { r2_key: string } | null
  selectMode: boolean
  selected: boolean
  onToggle: () => void
  swipeLeft?: SwipeAction
  swipeRight?: SwipeAction
}) {
  const label = post.title || post.content_text.slice(0, 70) || 'Untitled post'

  const cover = (
    <>
      <PostCover cover={post.cover} logo={logo} />
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: STATUS_DOT[post.status] ?? '#a09cc4' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] font-bold text-ink-soft">
          <span className="text-ink">{POST_TYPE_LABEL[post.post_type] ?? 'Post'}</span>
          {' · '}
          {CATEGORY_LABELS[post.category]} · {STATUS_LABEL[post.status] ?? post.status} · via {post.created_via}
        </p>
      </div>
    </>
  )

  // select mode: the whole card is a toggle, no navigation and no swiping
  if (selectMode) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${label}`}
        onClick={onToggle}
        className={cn(
          'pg-glass-strong flex w-full items-center gap-2.5 rounded-[20px] p-2.5 pr-3.5 text-left transition active:scale-[0.98]',
          selected && 'ring-2 ring-ink/20',
        )}
      >
        <PostCheck checked={selected} />
        {cover}
      </button>
    )
  }

  return (
    <SwipeRow left={swipeRight} right={swipeLeft}>
      <Link
        to={`/posts/${post.id}`}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className="pg-glass-strong flex items-center gap-3 rounded-[20px] p-2.5 pr-3.5 transition active:scale-[0.98]"
      >
        {cover}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-soft">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>
    </SwipeRow>
  )
}

/** 16:9 thumbnail for a post row: the post's own first image, else the project logo. */
function PostCover({
  cover,
  logo,
}: {
  cover?: PostListItem['cover']
  logo?: { r2_key: string } | null
}) {
  const key = cover?.r2_key ?? logo?.r2_key ?? null
  const url = useAssetUrl(key)
  const [broken, setBroken] = useState(false)
  return (
    <div className="relative aspect-video w-[104px] shrink-0 overflow-hidden rounded-[14px] bg-white/50">
      {url.data && !broken ? (
        <img
          src={url.data}
          alt=""
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/70 to-white/25">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft/50">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="8.5" cy="9.5" r="1.8" />
            <path d="M21 16l-5.5-5L7 20" />
          </svg>
        </div>
      )}
    </div>
  )
}

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 rounded-[16px] bg-white/45 px-3 py-2.5 transition hover:bg-white/65"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-lilac/70 text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-ink">{label}</span>
          <span className="block truncate text-[11px] font-semibold text-ink-soft">{url}</span>
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-soft">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14L21 3" />
        </svg>
      </a>
    </li>
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
