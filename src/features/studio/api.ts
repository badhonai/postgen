import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { isMissingTable } from '../prompts/api'

/**
 * Studio jobs — one folder per film, holding the working files that move between
 * the orchestration agent and the visual specialist: the recorded voice, the brief,
 * the source, and what came back. They are kept separate from post media on purpose
 * so a user can wipe a finished job without touching a published post.
 */
export type StudioJob = {
  id: string
  project_id: string | null
  title: string
  slug: string
  status: 'open' | 'returned' | 'rendered' | 'archived'
  voice_id: string | null
  voice_name: string | null
  spec: Record<string, unknown>
  note: string
  created_at: string
  updated_at: string
}

export type StudioFile = {
  id: string
  job_id: string
  path: string
  kind: 'handoff' | 'return' | 'render' | 'note'
  filename: string
  mime_type: string | null
  size_bytes: number | null
  r2_key: string
  created_at: string
}

export const STUDIO_KEY = ['studio-jobs'] as const

export type StudioData = { jobs: StudioJob[]; files: StudioFile[]; missing: boolean }

export function useStudioJobs() {
  return useQuery({
    queryKey: STUDIO_KEY,
    enabled: !!supabase,
    queryFn: async (): Promise<StudioData> => {
      const { data: jobs, error } = await supabase!
        .from('studio_jobs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        if (isMissingTable(error)) return { jobs: [], files: [], missing: true }
        throw error
      }
      const ids = (jobs ?? []).map((j) => (j as StudioJob).id)
      if (ids.length === 0) return { jobs: [], files: [], missing: false }
      const { data: files, error: fErr } = await supabase!
        .from('studio_job_files')
        .select('*')
        .in('job_id', ids)
        .order('path')
      if (fErr) {
        if (isMissingTable(fErr)) return { jobs: (jobs ?? []) as StudioJob[], files: [], missing: false }
        throw fErr
      }
      return { jobs: (jobs ?? []) as StudioJob[], files: (files ?? []) as StudioFile[], missing: false }
    },
  })
}

async function sessionFetch(url: string, method: string): Promise<void> {
  const { data } = await supabase!.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('not signed in')
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `request failed (${response.status})`)
  }
}

/** Wipes the whole working folder (R2 objects + rows) — the page's "Clear storage". */
export function useDeleteStudioJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (jobId: string) => {
      await sessionFetch(`/api/studio/jobs/${encodeURIComponent(jobId)}`, 'DELETE')
      return jobId
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: STUDIO_KEY }),
  })
}

export function useDeleteStudioFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: StudioFile) => {
      await sessionFetch(
        `/api/studio/jobs/${encodeURIComponent(file.job_id)}/files/${encodeURIComponent(file.id)}`,
        'DELETE',
      )
      return file.id
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: STUDIO_KEY }),
  })
}
