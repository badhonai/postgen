import { useMemo } from 'react'
import { useProjects } from '../features/projects/api'
import { usePosts } from '../features/posts/api'

export interface ProjectCadence {
  intervalDays: number
  targetDays?: number[]
}

export const CADENCE_STORAGE_KEY = 'postgen_project_cadence_v1'

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
 * - If user posts once, the latest published post is updated to today (0 days elapsed),
 *   completely resetting any previous overdue count and starting fresh from that moment.
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
 * Respects 0:00 UTC day boundaries and resets immediately as soon as a project is posted.
 */
export function useDueProjectsCount(): number {
  const projectsQ = useProjects()
  const postsQ = usePosts({ status: 'published' })

  return useMemo(() => {
    const projects = projectsQ.data ?? []
    const posts = postsQ.data ?? []
    if (projects.length === 0) return 0

    const cadences = loadCadences()
    const now = Date.now()

    // Find latest published post per project (posts are ordered updated_at / published_at desc)
    const latestByProject = new Map<string, string>()
    for (const p of posts) {
      if (!latestByProject.has(p.project_id)) {
        const iso = p.published_at ?? p.updated_at
        latestByProject.set(p.project_id, iso)
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
  }, [projectsQ.data, postsQ.data])
}
