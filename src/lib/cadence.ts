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
 * Counts how many projects currently have a post due today or overdue.
 * Reads published posts and compares days elapsed against each project's cadence interval.
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
    const dayMs = 86400000

    // Find latest published post per project
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
      if (lastIso) {
        const daysSince = Math.floor((now - new Date(lastIso).getTime()) / dayMs)
        if (daysSince >= cadence.intervalDays) {
          count++
        }
      }
    }
    return count
  }, [projectsQ.data, postsQ.data])
}
