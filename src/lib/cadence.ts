import { useEffect, useMemo, useState } from 'react'
import { useProjects } from '../features/projects/api'
import { usePosts } from '../features/posts/api'

export interface ProjectCadence {
  intervalDays: number
  targetDays?: number[]
}

export interface ManualPostLog {
  id: string
  projectId: string
  dateKey: string // YYYY-MM-DD
  publishedAt: string // ISO string
  note?: string
}

export const CADENCE_STORAGE_KEY = 'postgen_project_cadence_v1'
export const MANUAL_POSTS_STORAGE_KEY = 'postgen_manual_posts_v1'

export function loadCadences(): Record<string, ProjectCadence> {
  try {
    const raw = localStorage.getItem(CADENCE_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, ProjectCadence>
  } catch {
    /* fallback to empty */
  }
  return {}
}

export function saveCadences(data: Record<string, ProjectCadence>) {
  try {
    localStorage.setItem(CADENCE_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore storage errors */
  }
}

export function loadManualPosts(): ManualPostLog[] {
  try {
    const raw = localStorage.getItem(MANUAL_POSTS_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ManualPostLog[]
  } catch {
    /* fallback to empty */
  }
  return []
}

export function saveManualPosts(list: ManualPostLog[]) {
  try {
    localStorage.setItem(MANUAL_POSTS_STORAGE_KEY, JSON.stringify(list))
    window.dispatchEvent(new Event('postgen_manual_posts_updated'))
  } catch {
    /* ignore storage errors */
  }
}

export function logManualPost(projectId: string, dateKey: string, note?: string): ManualPostLog {
  const list = loadManualPosts()
  const publishedAt = `${dateKey}T12:00:00.000Z`
  const entry: ManualPostLog = {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    dateKey,
    publishedAt,
    note: note || 'External post on X',
  }
  saveManualPosts([entry, ...list])
  return entry
}

export function removeManualPost(id: string) {
  const list = loadManualPosts()
  saveManualPosts(list.filter((m) => m.id !== id))
}

/**
 * Number of whole calendar days elapsed in UTC between an ISO timestamp and now.
 * A new calendar day begins strictly at 0:00 UTC, so due states transition at
 * 0:00 UTC regardless of what time of day the post was originally published.
 */
export function getUtcDaysElapsed(isoDate: string, nowMs = Date.now()): number {
  const then = new Date(isoDate)
  const thenUtcMidnight = Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate())
  const now = new Date(nowMs)
  const nowUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dayMs = 86400000
  return Math.max(0, Math.floor((nowUtcMidnight - thenUtcMidnight) / dayMs))
}

export type CadenceStatusKind = 'on_track' | 'due' | 'overdue' | 'none'

export interface ProjectCadenceStatus {
  status: CadenceStatusKind
  daysElapsed: number | null
  statusLabel: string
  isDueOrOverdue: boolean
}

/**
 * Evaluates whether a project is on track, due today, or overdue.
 *
 * Rules:
 * - Every calendar day begins at 0:00 UTC.
 * - If user posts once (in app or logged externally), the latest post timestamp
 *   updates to that date (0 days elapsed if today), completely resetting any
 *   previous overdue count and starting fresh.
 */
export function computeCadenceStatus(
  lastPublishedIso: string | null | undefined,
  intervalDays: number,
  nowMs = Date.now(),
): ProjectCadenceStatus {
  if (!lastPublishedIso) {
    return {
      status: 'none',
      daysElapsed: null,
      statusLabel: `No posts yet · Target: every ${intervalDays}d (0:00 UTC reset)`,
      isDueOrOverdue: false,
    }
  }

  const daysElapsed = getUtcDaysElapsed(lastPublishedIso, nowMs)

  if (daysElapsed < intervalDays) {
    const left = intervalDays - daysElapsed
    const leftText = left === 1 ? 'due tomorrow' : `next in ${left}d`
    const postedText = daysElapsed === 0 ? 'posted today' : `${daysElapsed}d ago`
    return {
      status: 'on_track',
      daysElapsed,
      statusLabel: `On track · ${leftText} (last ${postedText})`,
      isDueOrOverdue: false,
    }
  }

  if (daysElapsed === intervalDays) {
    return {
      status: 'due',
      daysElapsed,
      statusLabel: `Due today · ${daysElapsed}d since last post (resets on post)`,
      isDueOrOverdue: true,
    }
  }

  const late = daysElapsed - intervalDays
  return {
    status: 'overdue',
    daysElapsed,
    statusLabel: `Overdue by ${late}d · last posted ${daysElapsed}d ago (resets on post)`,
    isDueOrOverdue: true,
  }
}

/**
 * Counts how many projects currently have a post due today or overdue.
 * Respects 0:00 UTC day boundaries, considers both in-app and external post logs,
 * and resets immediately as soon as a project is posted or marked as posted.
 */
export function useDueProjectsCount(): number {
  const projectsQ = useProjects()
  const postsQ = usePosts({ status: 'published' })
  const [manualVersion, setManualVersion] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setManualVersion((v) => v + 1)
    window.addEventListener('postgen_manual_posts_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('postgen_manual_posts_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  return useMemo(() => {
    const projects = projectsQ.data ?? []
    const posts = postsQ.data ?? []
    if (projects.length === 0) return 0

    const cadences = loadCadences()
    const now = Date.now()

    // Find latest published post per project (database posts)
    const latestByProject = new Map<string, string>()
    for (const p of posts) {
      if (!latestByProject.has(p.project_id)) {
        const iso = p.published_at ?? p.updated_at
        latestByProject.set(p.project_id, iso)
      }
    }

    // Merge manual / external post logs
    const manualPosts = loadManualPosts()
    for (const m of manualPosts) {
      const existing = latestByProject.get(m.projectId)
      if (!existing || new Date(m.publishedAt).getTime() > new Date(existing).getTime()) {
        latestByProject.set(m.projectId, m.publishedAt)
      }
    }

    let count = 0
    for (const proj of projects) {
      const cadence = cadences[proj.id] ?? { intervalDays: 2 }
      const lastIso = latestByProject.get(proj.id)
      const st = computeCadenceStatus(lastIso, cadence.intervalDays, now)
      if (st.isDueOrOverdue) {
        count++
      }
    }
    return count
    // manualVersion triggers re-evaluation when manual posts are added/removed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsQ.data, postsQ.data, manualVersion])
}
