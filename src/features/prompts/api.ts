import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/context'
import type { Asset } from '../../lib/types'

export type ImagePrompt = {
  id: string
  user_id: string
  name: string
  prompt: string
  notes: string
  reference_asset_ids: string[]
  /** Projects this prompt is for; empty = global (any project). */
  project_ids: string[]
  /** False (default): reference images are a cover — how the output
   *  looks — and must NOT be used as generation references. */
  use_reference_images: boolean
  /** Optional hex palette (e.g. #FF1E2D) the generated image must use. */
  color_codes: string[]
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

/** PostgREST errors are plain objects, so `instanceof Error` is false for them. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message
  const m = (e as { message?: string } | null)?.message
  return typeof m === 'string' && m ? m : fallback
}

export type PromptInput = {
  name: string
  prompt: string
  notes?: string
  referenceAssetIds?: string[]
  projectIds?: string[]
  useReferenceImages?: boolean
  colorCodes?: string[]
}

/** '#rrggbb' (any case, # optional) → '#RRGGBB', or null if invalid. */
export function normalizeHex(raw: string): string | null {
  const c = raw.trim()
  return /^#?[0-9a-fA-F]{6}$/.test(c) ? `#${c.replace('#', '').toUpperCase()}` : null
}

export function useCreateImagePrompt() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: PromptInput) => {
      // user_id has no default and RLS checks it — it has to be sent explicitly
      if (!user) throw new Error('not signed in')
      const { data, error } = await supabase!
        .from('image_prompts')
        .insert({
          user_id: user.id,
          name: input.name.trim() || 'Untitled prompt',
          prompt: input.prompt.trim(),
          notes: input.notes?.trim() ?? '',
          reference_asset_ids: input.referenceAssetIds ?? [],
          project_ids: input.projectIds ?? [],
          use_reference_images: input.useReferenceImages ?? false,
          color_codes: (input.colorCodes ?? []).map((c) => normalizeHex(c) ?? c),
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
          project_ids: input.projectIds ?? [],
          use_reference_images: input.useReferenceImages ?? false,
          color_codes: (input.colorCodes ?? []).map((c) => normalizeHex(c) ?? c),
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
