import { useState } from 'react'
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
import { HeroTile, SmallTile, type PostSummary } from '../features/projects/BentoTiles'
import { TILE_COLORS } from '../lib/types'
import ProjectForm from '../features/projects/ProjectForm'
import TabBar from '../components/TabBar'
import { Button, ErrorBox, Skeleton, SparkleLogo } from '../components/ui'

type Filter = 'all' | 'draft' | 'approved' | 'published'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'approved', label: 'Approved' },
  { id: 'published', label: 'Published' },
]

function matchesFilter(status: string, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'draft') return status === 'draft' || status === 'idea'
  return status === filter
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const projects = useProjects()
  const createProject = useCreateProject()
  const [creating, setCreating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

  const postsByProject = new Map<string, PostSummary[]>()
  for (const s of summaries.data ?? []) {
    const list = postsByProject.get(s.project_id) ?? []
    list.push(s)
    postsByProject.set(s.project_id, list)
  }

  const all = projects.data ?? []
  const visible =
    filter === 'all' ? all : all.filter((p) => (postsByProject.get(p.id) ?? []).some((s) => matchesFilter(s.status, filter)))

  const [hero, ...rest] = visible

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
          <div className="relative">
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="pg-glass flex h-11 w-11 items-center justify-center rounded-full text-ink transition active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="pg-glass-strong absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-2xl p-1.5">
                  <p className="truncate px-3 py-2 text-[11px] font-bold text-ink-soft">{user?.email}</p>
                  <button
                    type="button"
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink hover:bg-white/60"
                    onClick={() => navigate('/settings')}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-700 hover:bg-white/60"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
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
              <HeroTile project={hero} posts={postsByProject.get(hero.id) ?? []} />
              {rest.length > 0 ? (
                <div className="grid grid-cols-2 gap-3.5">
                  {rest.map((p, i) => (
                    <SmallTile
                      key={p.id}
                      project={p}
                      color={TILE_COLORS[(i + 1) % TILE_COLORS.length]}
                      postCount={(postsByProject.get(p.id) ?? []).length}
                    />
                  ))}
                </div>
              ) : null}
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
