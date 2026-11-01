import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { usePosts, type PostListItem } from '../features/posts/api'
import { useProjects } from '../features/projects/api'
import { useAssetUrl } from '../lib/media'
import { ErrorBox, Skeleton } from '../components/ui'
import TabBar from '../components/TabBar'
import { computeCadenceStatus, loadCadences, saveCadences, type ProjectCadence } from '../lib/cadence'
import { cn } from '../lib/cn'

type PlanTab = 'calendar' | 'reminders' | 'history'

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
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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

/** Small project logo icon rendered at the bottom of calendar date cells */
function MiniProjectLogo({ r2Key, name }: { r2Key?: string | null; name: string }) {
  const url = useAssetUrl(r2Key)
  if (!url.data) {
    return (
      <span
        title={name}
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/90 text-[7.5px] font-black text-ink shadow-2xs ring-1 ring-black/10"
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      src={url.data}
      alt={name}
      title={name}
      loading="lazy"
      className="h-3.5 w-3.5 shrink-0 rounded-full object-cover shadow-2xs ring-1 ring-white/90"
    />
  )
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const initialTab: PlanTab =
    (searchParams.get('tab') as PlanTab) ||
    (location.pathname === '/history' ? 'history' : 'calendar')

  const [activeTab, setActiveTab] = useState<PlanTab>(initialTab)

  // Fetch all posts so we have both published (for history/calendar) and unposted (for reminders)
  const postsQ = usePosts({})
  const projectsQ = useProjects()

  const publishedAt = (p: PostListItem) => p.published_at ?? p.updated_at

  const allPosts = postsQ.data ?? []

  // Published posts (newest first)
  const publishedEntries = useMemo(() => {
    const list = allPosts.filter((p) => p.status === 'published')
    list.sort((a, b) => publishedAt(b).localeCompare(publishedAt(a)))
    return list.slice(0, 100)
  }, [allPosts])

  // Ready / unposted posts grouped by project (drafts, approved posts)
  const readyPostsByProject = useMemo(() => {
    const map = new Map<string, PostListItem[]>()
    for (const p of allPosts) {
      if (p.status !== 'published') {
        map.set(p.project_id, [...(map.get(p.project_id) ?? []), p])
      }
    }
    return map
  }, [allPosts])

  const projectById = useMemo(
    () => new Map((projectsQ.data ?? []).map((p) => [p.id, p])),
    [projectsQ.data],
  )

  const groupedHistory = useMemo(() => {
    const map = new Map<string, PostListItem[]>()
    for (const e of publishedEntries) {
      const s = sectionOf(publishedAt(e))
      map.set(s, [...(map.get(s) ?? []), e])
    }
    return SECTIONS.filter((s) => map.has(s)).map((s) => ({ name: s, items: map.get(s)! }))
  }, [publishedEntries])

  const usedProjects = useMemo(() => new Set(publishedEntries.map((e) => e.project_id)).size, [publishedEntries])

  // ── Calendar state ──
  const [calDate, setCalDate] = useState<Date>(() => new Date())
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toDateKey(new Date()))

  // Map of YYYY-MM-DD -> published posts on that date
  const postsByDateKey = useMemo(() => {
    const map = new Map<string, PostListItem[]>()
    for (const p of publishedEntries) {
      const key = toDateKey(new Date(publishedAt(p)))
      map.set(key, [...(map.get(key) ?? []), p])
    }
    return map
  }, [publishedEntries])

  // Calendar month days calculation
  const calendarGrid = useMemo(() => {
    const year = calDate.getFullYear()
    const month = calDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ day: number | null; dateKey: string | null; isToday: boolean }> = []
    const todayKey = toDateKey(new Date())

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateKey: null, isToday: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      const key = toDateKey(dateObj)
      cells.push({ day: d, dateKey: key, isToday: key === todayKey })
    }
    return cells
  }, [calDate])

  const selectedDayPosts = useMemo(() => {
    return postsByDateKey.get(selectedDateKey) ?? []
  }, [postsByDateKey, selectedDateKey])

  // ── Cadence / Reminders state ──
  const [cadences, setCadences] = useState<Record<string, ProjectCadence>>(loadCadences)

  const updateCadence = (projectId: string, update: Partial<ProjectCadence>) => {
    setCadences((prev) => {
      const current = prev[projectId] ?? { intervalDays: 2, targetDays: [1, 3, 5] }
      const next = { ...prev, [projectId]: { ...current, ...update } }
      saveCadences(next)
      return next
    })
  }

  // Find latest published post per project
  const latestPostByProject = useMemo(() => {
    const map = new Map<string, PostListItem>()
    for (const p of publishedEntries) {
      if (!map.has(p.project_id)) {
        map.set(p.project_id, p)
      }
    }
    return map
  }, [publishedEntries])

  // Compute status per project
  const projectStatuses = useMemo(() => {
    const now = Date.now()

    return (projectsQ.data ?? []).map((project) => {
      const cadence = cadences[project.id] ?? { intervalDays: 2, targetDays: [1, 3, 5] }
      const latest = latestPostByProject.get(project.id)
      const lastIso = latest ? publishedAt(latest) : null
      const readyPosts = readyPostsByProject.get(project.id) ?? []

      const { status, statusLabel, daysElapsed } = computeCadenceStatus(
        lastIso,
        cadence.intervalDays,
        now,
      )

      return {
        project,
        cadence,
        latest,
        daysSince: daysElapsed,
        status,
        statusLabel,
        readyPosts,
      }
    })
  }, [projectsQ.data, cadences, latestPostByProject, readyPostsByProject])

  const reminderCounts = useMemo(() => {
    let due = 0
    let onTrack = 0
    let overdue = 0
    for (const ps of projectStatuses) {
      if (ps.status === 'due') due++
      else if (ps.status === 'overdue') overdue++
      else if (ps.status === 'on_track') onTrack++
    }
    return { due, onTrack, overdue, total: projectStatuses.length }
  }, [projectStatuses])

  return (
    <div className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-8 pb-28">
        {/* ── Top Header ── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to projects"
              onClick={() => navigate('/dashboard')}
              className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <h1 className="pg-title text-2xl leading-none text-ink">Planner & History</h1>
              <p className="mt-1 text-[11px] font-bold text-ink-soft">
                Plan days, target cadence & published history
              </p>
            </div>
          </div>
        </header>

        {/* ── 3 Main Segmented Tabs ── */}
        <div className="pg-glass mt-5 flex gap-1 rounded-full p-1.5 shadow-sm" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'calendar'}
            onClick={() => setActiveTab('calendar')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold transition active:scale-95',
              activeTab === 'calendar' ? 'bg-ink text-white shadow' : 'text-ink-soft hover:text-ink',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2.5" ry="2.5" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Calendar
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reminders'}
            onClick={() => setActiveTab('reminders')}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold transition active:scale-95',
              activeTab === 'reminders' ? 'bg-ink text-white shadow' : 'text-ink-soft hover:text-ink',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Reminders
            {reminderCounts.due + reminderCounts.overdue > 0 ? (
              <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            ) : null}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold transition active:scale-95',
              activeTab === 'history' ? 'bg-ink text-white shadow' : 'text-ink-soft hover:text-ink',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
              <path d="M12 7v5l3.5 2" />
            </svg>
            History
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: CALENDAR VIEW
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'calendar' ? (
          <div className="mt-5 space-y-4">
            {/* Month switcher */}
            <div className="pg-glass flex items-center justify-between rounded-[22px] px-4 py-3">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-white/40 active:scale-90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="text-center">
                <p className="pg-title text-base font-extrabold text-ink">
                  {calDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[10px] font-bold text-ink-soft">
                  Project logos show what was published on each day
                </p>
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-white/40 active:scale-90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="pg-glass rounded-[26px] p-3.5">
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((w, idx) => (
                  <span key={w} className="py-1 text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                    {DAY_LABELS[idx]}
                  </span>
                ))}
              </div>

              <div className="mt-1.5 grid grid-cols-7 gap-1">
                {calendarGrid.map((cell, idx) => {
                  if (!cell.day || !cell.dateKey) {
                    return <div key={`empty-${idx}`} className="h-13.5" />
                  }
                  const postList = postsByDateKey.get(cell.dateKey) ?? []
                  // Unique project IDs for published posts on this day
                  const projectIds = Array.from(new Set(postList.map((p) => p.project_id)))
                  const isSelected = selectedDateKey === cell.dateKey

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(cell.dateKey!)}
                      className={cn(
                        'relative flex h-13.5 flex-col items-center justify-between rounded-[14px] px-0.5 py-1.5 transition active:scale-95',
                        isSelected
                          ? 'bg-ink text-white shadow'
                          : cell.isToday
                            ? 'bg-lilac/70 text-ink ring-1.5 ring-ink/30'
                            : 'text-ink hover:bg-white/40',
                      )}
                    >
                      <span className="text-[12px] font-extrabold leading-none">{cell.day}</span>

                      {/* Small project logo icon(s) on bottom of the date */}
                      {projectIds.length > 0 ? (
                        <div className="flex items-center justify-center gap-0.5">
                          {projectIds.slice(0, 2).map((pid) => {
                            const proj = projectById.get(pid)
                            return (
                              <MiniProjectLogo
                                key={pid}
                                r2Key={proj?.logo?.r2_key}
                                name={proj?.name ?? 'P'}
                              />
                            )
                          })}
                          {projectIds.length > 2 ? (
                            <span
                              className={cn(
                                'text-[8px] font-black leading-none',
                                isSelected ? 'text-white/80' : 'text-ink-soft',
                              )}
                            >
                              +{projectIds.length - 2}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="h-3.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Date Posts */}
            <div className="pg-glass rounded-[24px] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Selected Day</p>
                  <p className="pg-title mt-0.5 text-base text-ink">
                    {new Date(selectedDateKey + 'T12:00:00').toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-lilac px-2.5 py-1 text-xs font-extrabold text-ink">
                  {selectedDayPosts.length} post{selectedDayPosts.length === 1 ? '' : 's'}
                </span>
              </div>

              {selectedDayPosts.length === 0 ? (
                <div className="mt-4 rounded-[18px] bg-white/40 p-4 text-center">
                  <p className="text-xs font-semibold text-ink-soft">
                    No posts published on this day.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedDayPosts.map((post) => {
                    const project = projectById.get(post.project_id)
                    return (
                      <Link
                        key={post.id}
                        to={`/posts/${post.id}`}
                        className="flex items-center gap-3 rounded-[18px] bg-white/60 p-2.5 transition active:scale-[0.99]"
                      >
                        <ProjectLogo r2Key={project?.logo?.r2_key} name={project?.name ?? 'Project'} />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-xs font-bold text-ink">{post.title || 'Untitled'}</p>
                          <p className="text-[10px] font-bold text-ink-soft">{project?.name ?? 'Project'}</p>
                        </div>
                        <span className="text-[11px] font-extrabold text-ink-soft">View →</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: REMINDERS & CADENCE PLANNER
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'reminders' ? (
          <div className="mt-5 space-y-4">
            {/* Status overview cards */}
            <div className="pg-glass rounded-[24px] p-4">
              <p className="pg-title text-base text-ink">Posting Cadence & Targets</p>
              <p className="mt-1 text-xs font-semibold text-ink-soft">
                Choose how often each project should post. When a project is due, pick and post any of its ready posts directly.
              </p>
              <div className="mt-3 flex gap-2">
                <div className="flex-1 rounded-[16px] bg-emerald-500/10 p-2.5 text-center">
                  <p className="text-[10px] font-extrabold tracking-wide text-emerald-800 uppercase">On Track</p>
                  <p className="mt-0.5 text-lg font-extrabold text-emerald-700">{reminderCounts.onTrack}</p>
                </div>
                <div className="flex-1 rounded-[16px] bg-amber-500/10 p-2.5 text-center">
                  <p className="text-[10px] font-extrabold tracking-wide text-amber-800 uppercase">Due Today</p>
                  <p className="mt-0.5 text-lg font-extrabold text-amber-700">{reminderCounts.due}</p>
                </div>
                <div className="flex-1 rounded-[16px] bg-rose-500/10 p-2.5 text-center">
                  <p className="text-[10px] font-extrabold tracking-wide text-rose-800 uppercase">Overdue</p>
                  <p className="mt-0.5 text-lg font-extrabold text-rose-700">{reminderCounts.overdue}</p>
                </div>
              </div>
            </div>

            {/* List of Projects with Cadence Knobs & Ready Posts to Post */}
            <div className="space-y-3">
              {projectStatuses.map(({ project, cadence, status, statusLabel, readyPosts }) => {
                const badgeColor =
                  status === 'on_track'
                    ? 'bg-emerald-500/15 text-emerald-700'
                    : status === 'due'
                      ? 'bg-amber-500/15 text-amber-700'
                      : status === 'overdue'
                        ? 'bg-rose-500/15 text-rose-700'
                        : 'bg-white/60 text-ink-soft'

                return (
                  <div key={project.id} className="pg-glass rounded-[24px] p-4">
                    <div className="flex items-center gap-3">
                      <ProjectLogo r2Key={project.logo?.r2_key} name={project.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-ink">{project.name}</p>
                        <p className="truncate text-[11px] font-bold text-ink-soft">
                          {project.x_username ? `@${project.x_username}` : 'No handle set'}
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold capitalize', badgeColor)}>
                        {status === 'on_track' ? 'On track' : status === 'due' ? 'Due today' : status === 'overdue' ? 'Overdue' : 'New'}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-ink-soft">
                      {statusLabel}
                    </p>

                    {/* Cadence interval buttons */}
                    <div className="mt-3">
                      <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">
                        Post frequency:
                      </p>
                      <div className="mt-1.5 flex gap-1.5">
                        {[1, 2, 3, 5, 7].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => updateCadence(project.id, { intervalDays: days })}
                            className={cn(
                              'flex-1 rounded-xl py-1.5 text-xs font-extrabold transition active:scale-95',
                              cadence.intervalDays === days
                                ? 'bg-ink text-white shadow-sm'
                                : 'bg-white/50 text-ink-soft hover:text-ink',
                            )}
                          >
                            {days === 1 ? '1d' : `${days}d`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ready Posts to Post (no need to create, just post any ready post) */}
                    <div className="mt-3.5 border-t border-ink/8 pt-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">
                          Ready to post ({readyPosts.length}):
                        </p>
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-[11px] font-extrabold text-ink hover:underline"
                        >
                          All project posts →
                        </Link>
                      </div>

                      {readyPosts.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {readyPosts.slice(0, 2).map((rp) => (
                            <Link
                              key={rp.id}
                              to={`/posts/${rp.id}`}
                              className="flex items-center justify-between gap-2 rounded-[16px] bg-white/60 px-3 py-2 text-xs font-bold text-ink transition hover:bg-white active:scale-[0.99]"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {rp.title || 'Untitled post'}
                              </span>
                              <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[10px] font-extrabold text-white shadow-xs">
                                Post on X →
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between rounded-[14px] bg-white/40 px-3 py-2">
                          <span className="text-xs font-semibold text-ink-soft">
                            No unposted drafts in project
                          </span>
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-xs font-extrabold text-ink hover:underline"
                          >
                            Open project →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: PUBLISHED HISTORY
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' ? (
          <div className="mt-5">
            {postsQ.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-[24px]" />
                <Skeleton className="h-[76px] w-full rounded-[22px]" />
                <Skeleton className="h-[76px] w-full rounded-[22px]" />
              </div>
            ) : postsQ.error ? (
              <ErrorBox message={postsQ.error instanceof Error ? postsQ.error.message : 'Failed to load published history'} />
            ) : publishedEntries.length === 0 ? (
              <div className="pg-glass rounded-[28px] p-8 text-center">
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
                <div className="pg-glass flex items-center justify-between rounded-[24px] px-4 py-3.5">
                  <div>
                    <p className="pg-title text-lg leading-none text-ink">{publishedEntries.length} published</p>
                    <p className="mt-1 text-[11px] font-bold text-ink-soft">across {usedProjects} project{usedProjects === 1 ? '' : 's'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">Latest</p>
                    <p className="mt-0.5 text-sm font-extrabold text-ink">{timeAgo(publishedAt(publishedEntries[0]))}</p>
                  </div>
                </div>

                {groupedHistory.map((section) => (
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
        ) : null}
      </div>

      {/* ── Docked TabBar with Plan active ── */}
      <TabBar active="plan" />
    </div>
  )
}
