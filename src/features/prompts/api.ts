import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Asset } from '../../lib/types'

export type ImagePrompt = {
  id: string
  user_id: string
  name: string
  prompt: string
  notes: string
  reference_asset_ids: string[]
  created_at: string
  updated_at: string
}

export const PROMPTS_KEY = ['image-prompts'] as const

/**
 * PostgREST answers PGRST205 when a table isn't in the schema cache yet —
 * which is exactly the state between deploying this feature and the
 * `image_prompts` migration being applied. Treat it as "no prompts" rather
 * than an error so the dashboard never breaks on it.
 */
export function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code
  if (code === 'PGRST205' || code === '42P01') return true
  return /does not exist|schema cache/i.test((e as { message?: string } | null)?.message ?? '')
}

export type PromptsResult = { prompts: ImagePrompt[]; missing: boolean }

export function useImagePrompts() {
  return useQuery({
    queryKey: PROMPTS_KEY,
    enabled: !!supabase,
    queryFn: async (): Promise<PromptsResult> => {
      const { data, error } = await supabase!
        .from('image_prompts')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        if (isMissingTable(error)) return { prompts: [], missing: true }
        throw error
      }
      return { prompts: (data ?? []) as ImagePrompt[], missing: false }
    },
  })
}

export type PromptInput = {
  name: string
  prompt: string
  notes?: string
  referenceAssetIds?: string[]
}

export function useCreateImagePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PromptInput) => {
      const { data, error } = await supabase!
        .from('image_prompts')
        .insert({
          name: input.name.trim() || 'Untitled prompt',
          prompt: input.prompt.trim(),
          notes: input.notes?.trim() ?? '',
          reference_asset_ids: input.referenceAssetIds ?? [],
        })
        .select()
        .single()
      if (error) throw error
      return data as ImagePrompt
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PROMPTS_KEY }),
  })
}

export function useUpdateImagePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: PromptInput & { id: string }) => {
      const { error } = await supabase!
        .from('image_prompts')
        .update({
          name: input.name.trim() || 'Untitled prompt',
          prompt: input.prompt.trim(),
          notes: input.notes?.trim() ?? '',
          reference_asset_ids: input.referenceAssetIds ?? [],
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PROMPTS_KEY }),
  })
}

export function useDeleteImagePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('image_prompts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PROMPTS_KEY }),
  })
}

/**
 * Reference media is picked from the user's whole library, not one project —
 * prompts are shared across projects, so their references should be too.
 * Returns every asset the user owns, grouped by project name.
 */
export function useAllAssetsByProject() {
  return useQuery({
    queryKey: ['all-assets-by-project'],
    enabled: !!supabase,
    queryFn: async (): Promise<Array<{ projectId: string; projectName: string; assets: Asset[] }>> => {
      const { data: projects, error: pErr } = await supabase!
        .from('projects')
        .select('id, name')
        .order('name')
      if (pErr) throw pErr
      const { data: assets, error: aErr } = await supabase!
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (aErr) throw aErr

      const nameOf = new Map((projects ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
      const groups = new Map<string, Asset[]>()
      for (const a of (assets ?? []) as Asset[]) {
        const list = groups.get(a.project_id) ?? []
        list.push(a)
        groups.set(a.project_id, list)
      }
      return [...groups.entries()].map(([projectId, list]) => ({
        projectId,
        projectName: nameOf.get(projectId) ?? 'Unknown project',
        assets: list,
      }))
    },
  })
}
