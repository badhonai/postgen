import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { uploadAsset } from '../../lib/media'
import type { Asset, BrandVoice, OfficialLink, Project } from '../../lib/types'

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'project'
  )
}

function cleanList(list: string[] | undefined): string[] {
  return (list ?? []).map((s) => s.trim()).filter(Boolean)
}

function cleanLinks(links: OfficialLink[] | undefined): OfficialLink[] {
  return (links ?? [])
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label && l.url)
}

function projectRow(input: ProjectInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    description: input.description.trim() || null,
    brand_voice: input.brandVoice,
    x_username: input.xUsername.trim().replace(/^@/, '') || null,
    website_url: input.websiteUrl.trim() || null,
    content_pillars: cleanList(input.contentPillars),
    sample_posts: cleanList(input.samplePosts),
    custom_instructions: input.customInstructions.trim() || null,
    official_links: cleanLinks(input.officialLinks),
  }
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    enabled: !!supabase,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase!
        .from('projects')
        .select('*, logo:assets!projects_logo_asset_id_fkey(r2_key)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    enabled: !!supabase && !!id,
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase!
        .from('projects')
        .select('*, logo:assets!projects_logo_asset_id_fkey(r2_key)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as Project | null
    },
  })
}

export type ProjectInput = {
  name: string
  description: string
  brandVoice: BrandVoice
  xUsername: string
  websiteUrl: string
  contentPillars: string[]
  samplePosts: string[]
  customInstructions: string
  officialLinks: OfficialLink[]
  /** Files picked in the form, uploaded after the project row exists (or after save). */
  newAssets: File[]
  /** Index into newAssets that becomes the project logo (default: first image). */
  newLogoIndex: number | null
}

export const EMPTY_PROJECT_INPUT: ProjectInput = {
  name: '',
  description: '',
  brandVoice: {},
  xUsername: '',
  websiteUrl: '',
  contentPillars: [],
  samplePosts: [],
  customInstructions: '',
  officialLinks: [],
  newAssets: [],
  newLogoIndex: null,
}

export function projectInputOf(project: Project): ProjectInput {
  return {
    name: project.name,
    description: project.description ?? '',
    brandVoice: project.brand_voice ?? {},
    xUsername: project.x_username ?? '',
    websiteUrl: project.website_url ?? '',
    contentPillars: project.content_pillars ?? [],
    samplePosts: project.sample_posts ?? [],
    customInstructions: project.custom_instructions ?? '',
    officialLinks: project.official_links ?? [],
    newAssets: [],
    newLogoIndex: null,
  }
}

async function insertProject(input: ProjectInput, slug: string): Promise<Project> {
  const { data, error } = await supabase!
    .from('projects')
    .insert({ ...projectRow(input), slug })
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProjectInput): Promise<Project> => {
      const base = slugify(input.name)
      try {
        return await insertProject(input, base)
      } catch (err) {
        // unique (user_id, slug) collision → retry once with a suffix
        const code = (err as { code?: string }).code
        if (code === '23505') {
          return insertProject(input, `${base}-${Date.now().toString(36).slice(-4)}`)
        }
        throw err
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProjectInput): Promise<Project> => {
      const { data, error } = await supabase!
        .from('projects')
        .update(projectRow(input))
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: ['projects', project.id] })
    },
  })
}

export function useSetProjectLogo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (logoAssetId: string | null) => setProjectLogo(id, logoAssetId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export async function setProjectLogo(id: string, logoAssetId: string | null): Promise<void> {
  const { error } = await supabase!
    .from('projects')
    .update({ logo_asset_id: logoAssetId })
    .eq('id', id)
  if (error) throw error
}

/**
 * Uploads files picked in the project form (after the project row exists)
 * and marks the chosen one as project logo (default: first image).
 */
export async function applyNewAssets(projectId: string, input: ProjectInput): Promise<void> {
  const files = input.newAssets ?? []
  if (!files.length) return
  const uploaded: Asset[] = []
  for (const file of files) {
    uploaded.push(await uploadAsset(file, projectId))
  }
  const firstImage = uploaded.find((a) => a.mime_type.startsWith('image/'))
  const chosen = input.newLogoIndex != null ? uploaded[input.newLogoIndex] : undefined
  const logo = chosen && chosen.mime_type.startsWith('image/') ? chosen : firstImage
  if (logo) await setProjectLogo(projectId, logo.id)
}

export function useSetAssetKind() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ assetId, kind }: { assetId: string; kind: string }): Promise<void> => {
      const { error } = await supabase!.from('assets').update({ kind: kind.trim() || 'other' }).eq('id', assetId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assets'] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase!.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
