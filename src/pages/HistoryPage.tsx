import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePosts, type PostListItem } from '../features/posts/api'
import { useProjects } from '../features/projects/api'
import { useAssetUrl } from '../lib/media'
import { ErrorBox, Skeleton } from '../components/ui'

/** "2h ago" / "3d ago" style relative time. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (d < 30) return `${w}w ago`
  const mo = Math.floor(d / 30)
  if (d < 365) return `${mo}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

function exactWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function sectionOf(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayMs = 86400000
  const diff = startOf(now) - startOf(d)
  if (diff <= 0) return 'Today'
  if (diff === dayMs) return 'Yesterday'
  if (diff < 7 * dayMs) return 'This week'
  if (diff < 30 * dayMs) return 'This month'
  return 'Earlier'
}

const SECTIONS = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier']

function ProjectLogo({ r2Key, name }: { r2Key?: string | null; name: string }) {
  const url = useAssetUrl(r2Key)
  if (!url.data) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/70 font-display text-sm font-semibold text-ink-soft">
        {name.slice(0, 1).toUpperCase()}
      </div>
    )
  }
  return <img src={url.data} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-[14px] object-cover ring-1 ring-white/70" />
}

/** History — everything already published, newest first, grouped by when. */
export default function HistoryPage() {
  const navigate = useNavigate()
  const postsQ = usePosts({ status: 'published' })
  const projectsQ = useProjects()

  const publishedAt = (p: PostListItem) => p.published_at ?? p.updated_at

  const entries = useMemo(() => {
    const list = [...(postsQ.data ?? [])]
    list.sort((a, b) => publishedAt(b).localeCompare(publishedAt(a)))
    return list.slice(0, 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsQ.data])

  const projectById = useMemo(
    () => new Map((projectsQ.data ?? []).map((p) => [p.id, p])),
    [projectsQ.data],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, PostListItem[]>()
    for (const e of entries) {
      const s = sectionOf(publishedAt(e))
      map.set(s, [...(map.get(s) ?? []), e])
    }
    return SECTIONS.filter((s) => map.has(s)).map((s) => ({ name: s, items: map.get(s)! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const usedProjects = useMemo(() => new Set(entries.map((e) => e.project_id)).size, [entries])

  return (
    <div className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-8 pb-24">
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/dashboard')}
            className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="pg-title text-2xl leading-none text-ink">History</h1>
            <p className="mt-1 text-[11px] font-bold text-ink-soft">What you published, and when</p>
          </div>
        </header>

        {postsQ.isPending ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-20 w-full rounded-[24px]" />
            <Skeleton className="h-[76px] w-full rounded-[22px]" />
            <Skeleton className="h-[76px] w-full rounded-[22px]" />
            <Skeleton className="h-[76px] w-full rounded-[22px]" />
          </div>
        ) : postsQ.error ? (
          <div className="mt-6">
            <ErrorBox message={postsQ.error instanceof Error ? postsQ.error.message : 'Failed to load published history'} />
          </div>
        ) : entries.length === 0 ? (
          <div className="pg-glass mt-6 rounded-[28px] p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lilac text-ink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
                <path d="M12 7v5l3.5 2" />
              </svg>
            </div>
            <h2 className="pg-title mt-4 text-xl text-ink">Nothing published yet</h2>
            <p className="mx-auto mt-2 max-w-[260px] text-sm font-semibold text-ink-soft">
              When you publish a post, it will show up here with the project and how long ago it went out.
            </p>
          </div>
        ) : (
          <>
            <div className="pg-glass mt-6 flex items-center justify-between rounded-[24px] px-4 py-3.5">
              <div>
                <p className="pg-title text-lg leading-none text-ink">{entries.length} published</p>
                <p className="mt-1 text-[11px] font-bold text-ink-soft">across {usedProjects} project{usedProjects === 1 ? '' : 's'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">Latest</p>
                <p className="mt-0.5 text-sm font-extrabold text-ink">{timeAgo(publishedAt(entries[0]))}</p>
              </div>
            </div>

            {grouped.map((section) => (
              <section key={section.name} className="mt-6">
                <h2 className="flex items-baseline gap-2 text-[12px] font-extrabold tracking-wide text-ink-soft uppercase">
                  {section.name}
                  <span className="text-[10px] font-bold normal-case">{section.items.length}</span>
                </h2>
                <div className="mt-2.5 space-y-2">
                  {section.items.map((post) => {
                    const project = projectById.get(post.project_id)
                    const when = publishedAt(post)
                    return (
                      <Link
                        key={post.id}
                        to={`/posts/${post.id}`}
                        className="pg-glass flex items-center gap-3 rounded-[22px] p-3 transition active:scale-[0.99]"
                      >
                        <ProjectLogo r2Key={project?.logo?.r2_key} name={project?.name ?? 'Project'} />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] leading-snug font-bold text-ink">
                            {post.title || 'Untitled post'}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-bold text-ink-soft">
                            {project?.name ?? 'Project'}
                            {project?.x_username ? ` · @${project.x_username}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-block rounded-full bg-[#e4ebff] px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-[#3f63c8]">
                            {timeAgo(when)}
                          </span>
                          <p className="mt-1 text-[10px] font-bold whitespace-nowrap text-ink-soft">{exactWhen(when)}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
