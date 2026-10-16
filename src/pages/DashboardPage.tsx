import type { User } from '@supabase/supabase-js'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../features/auth/context'
import { supabase } from '../lib/supabase'
import {
  applyNewAssets,
  useCreateProject,
  useProjects,
  type ProjectInput,
} from '../features/projects/api'
import {
  HeroTile,
  PromptLibraryTile,
  SmallTile,
  type PostSummary,
} from '../features/projects/BentoTiles'
import { TILE_COLORS } from '../lib/types'
import ProjectForm from '../features/projects/ProjectForm'
import { useImagePrompts } from '../features/prompts/api'
import { usePendingShareCount } from '../features/shares/api'
import { applyTheme, getTheme, type ThemeMode } from '../lib/theme'
import TabBar from '../components/TabBar'
import { Button, ErrorBox, Skeleton, SparkleLogo } from '../components/ui'

type Filter = 'all' | 'draft' | 'approved' | 'published'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'approved', label: 'Approved' },
  { id: 'published', label: 'Published' },
]

function UserAvatar({ user }: { user: User | null }) {
  const [failed, setFailed] = useState(false)
  const handle = String(
    (user?.user_metadata as { x_username?: string } | undefined)?.x_username ?? '',
  )
  const email = user?.email ?? ''
  if (handle && !failed) {
    return (
      <img
        src={`https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`}
        alt={`@${handle}`}
        onError={() => setFailed(true)}
        className="h-11 w-11 rounded-full object-cover ring-2 ring-white/80"
      />
    )
  }
  return (
    <span className="pg-glass flex h-11 w-11 items-center justify-center rounded-full font-display text-lg font-semibold text-ink">
      {(handle || email).slice(0, 1).toUpperCase()}
    </span>
  )
}

type StatusCounts = { drafts: number; approved: number }

/** Ideas count as drafts, like the Tabs do. */
function statusCounts(posts: PostSummary[]): StatusCounts {
  let drafts = 0
  let approved = 0
  for (const p of posts) {
    if (p.status === 'draft' || p.status === 'idea') drafts++
    else if (p.status === 'approved') approved++
  }
  return { drafts, approved }
}

function matchesFilter(status: string, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'draft') return status === 'draft' || status === 'idea'
  return status === filter
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const projects = useProjects()
  const createProject = useCreateProject()
  const prompts = useImagePrompts()
  const pendingShares = usePendingShareCount()
  const [theme, setTheme] = useState<ThemeMode>(getTheme)
  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const summaries = useQuery({
    queryKey: ['post-summaries'],
    enabled: !!supabase,
    queryFn: async (): Promise<PostSummary[]> => {
      const { data, error } = await supabase!
        .from('posts')
        .select('id, project_id, title, status')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PostSummary[]
    },
  })

  const postsByProject = useMemo(() => {
    const map = new Map<string, PostSummary[]>()
    for (const s of summaries.data ?? []) {
      const list = map.get(s.project_id) ?? []
      list.push(s)
      map.set(s.project_id, list)
    }
    return map
  }, [summaries.data])

  const all = projects.data ?? []
  const visible =
    filter === 'all' ? all : all.filter((p) => (postsByProject.get(p.id) ?? []).some((s) => matchesFilter(s.status, filter)))

  const [hero, ...rest] = visible
  const promptCount = prompts.data?.prompts.length ?? 0

  const handleCreate = (input: ProjectInput) => {
    createProject.mutate(input, {
      onSuccess: (project) => {
        setCreating(false)
        void applyNewAssets(project.id, input)
          .catch((err: unknown) =>
            window.alert(err instanceof Error ? err.message : 'asset upload failed'),
          )
          .finally(() => {
            void projects.refetch()
            void summaries.refetch()
          })
      },
    })
  }

  return (
    <div className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-8 pb-36">
        {/* ── header ── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <SparkleLogo size={46} />
            <div>
              <p className="pg-title text-lg leading-none text-ink">PostGen</p>
              <p className="mt-1 text-[11px] font-bold text-ink-soft">X Post Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={
                (pendingShares.data ?? 0) > 0
                  ? `Shares, ${pendingShares.data} waiting to accept`
                  : 'Shares'
              }
              title="Shares — send & receive"
              onClick={() => navigate('/shares')}
              className="pg-glass relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>
              {(pendingShares.data ?? 0) > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white/80">
                  {pendingShares.data}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              onClick={toggleTheme}
              className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              aria-label="Your profile"
              onClick={() => navigate('/profile')}
              className="transition active:scale-95"
            >
              <UserAvatar user={user} />
            </button>
          </div>
        </header>

        <h1 className="pg-title mt-5 text-[2.35rem] leading-none whitespace-nowrap text-ink">
          Your Projects
        </h1>

        {/* ── filter pills ── */}
        <div className="pg-glass mt-5 flex gap-1 rounded-full p-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`flex-1 rounded-full px-1 py-2 text-[13px] font-extrabold transition ${
                filter === f.id
                  ? 'bg-butter text-ink shadow-[0_2px_10px_rgba(251,193,60,0.45)]'
                  : 'text-ink-soft'
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── bento grid ── */}
        <section className="mt-5 space-y-3.5">
          {projects.isPending ? (
            <>
              <Skeleton className="h-56 w-full rounded-[28px]" />
              <div className="grid grid-cols-2 gap-3.5">
                <Skeleton className="h-40 rounded-[28px]" />
                <Skeleton className="h-40 rounded-[28px]" />
              </div>
            </>
          ) : projects.error ? (
            <ErrorBox
              message={
                projects.error instanceof Error ? projects.error.message : 'Failed to load projects'
              }
            />
          ) : visible.length === 0 ? (
            <div className="pg-glass rounded-[28px] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-butter text-2xl shadow-[0_10px_24px_rgba(242,193,78,0.4)]">
                ✦
              </div>
              <h2 className="pg-title mt-4 text-xl text-ink">
                {filter === 'all' ? 'No projects yet' : `Nothing ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()}`}
              </h2>
              <p className="mx-auto mt-2 max-w-[260px] text-sm font-semibold text-ink-soft">
                {filter === 'all'
                  ? 'A project holds your posts, brand voice, links and assets for one venture.'
                  : 'No project has posts in that state yet.'}
              </p>
              {filter === 'all' ? (
                <Button className="mt-5" onClick={() => setCreating(true)}>
                  + New project
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <HeroTile
                project={hero}
                posts={postsByProject.get(hero.id) ?? []}
                draftCount={statusCounts(postsByProject.get(hero.id) ?? []).drafts}
                approvedCount={statusCounts(postsByProject.get(hero.id) ?? []).approved}
                statusTab={filter === 'all' ? 'approved' : filter}
              />
              <div className="grid grid-cols-2 gap-3.5">
                <PromptLibraryTile promptCount={promptCount} />
                {rest.map((p, i) => {
                  const projectPosts = postsByProject.get(p.id) ?? []
                  const counts = statusCounts(projectPosts)
                  return (
                    <SmallTile
                      key={p.id}
                      project={p}
                      color={TILE_COLORS[(i + 1) % TILE_COLORS.length]}
                      postCount={projectPosts.length}
                      draftCount={counts.drafts}
                      approvedCount={counts.approved}
                      statusTab={filter === 'all' ? 'approved' : filter}
                    />
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── create sheet ── */}
      {creating ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-sm">
          <div className="pg-glass-strong max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[32px] p-6 pb-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="pg-title text-2xl text-ink">New project</h2>
              <button
                type="button"
                aria-label="Close"
                className="pg-glass flex h-10 w-10 items-center justify-center rounded-full text-ink"
                onClick={() => setCreating(false)}
              >
                ✕
              </button>
            </div>
            <ProjectForm
              busy={createProject.isPending}
              error={createProject.error instanceof Error ? createProject.error.message : null}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
            />
          </div>
        </div>
      ) : null}

      <TabBar active="projects" onPlus={() => setCreating(true)} />
    </div>
  )
}
