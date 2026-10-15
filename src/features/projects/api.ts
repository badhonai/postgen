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

/**
 * Display order for projects: the user's own order from Settings
 * (`sort_order`, lower first) wins; unordered projects (null — e.g.
 * freshly imported ones) go last, newest first among themselves.
 */
export function orderProjects(list: Project[]): Project[] {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? null
    const bo = b.sort_order ?? null
    if (ao !== null && bo !== null) return ao - bo
    if (ao !== null) return -1
    if (bo !== null) return 1
    return b.created_at.localeCompare(a.created_at)
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    enabled: !!supabase,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase!
        .from('projects')
        .select('*, logo:assets!projects_logo_asset_id_fkey(r2_key)')
      if (error) throw error
      return orderProjects(data as Project[])
    },
  })
}

/** Persist a new display order (ids in the order they should show). */
export function useReorderProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      const results = await Promise.all(
        ids.map((id, i) => supabase!.from('projects').update({ sort_order: i }).eq('id', id)),
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    // Instant feedback: rearrange the cached list while the writes run.
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ['projects'] })
      const prev = qc.getQueryData<Project[]>(['projects'])
      if (prev) {
        const rank = new Map(ids.map((id, i) => [id, i]))
        qc.setQueryData<Project[]>(
          ['projects'],
          orderProjects(prev.map((p) => ({ ...p, sort_order: rank.get(p.id) ?? null }))),
        )
      }
      return { prev }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(['projects'], ctx.prev)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
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
  /** Asset kind per file in newAssets (same order); defaults to 'other'. */
  newAssetKinds: string[]
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
  newAssetKinds: [],
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
    newAssetKinds: [],
    newLogoIndex: null,
  }
}

async function insertProject(input: ProjectInput, slug: string): Promise<Project> {
  const { data: authData, error: authErr } = await supabase!.auth.getUser()
  const userId = authData.user?.id
  if (authErr || !userId) throw authErr ?? new Error('Not signed in')
  // New projects go last in the user's chosen order. If the sort_order
  // column isn't there yet (migration pending), insert without it.
  let sortOrder: number | undefined
  const { data: rows, error: orderErr } = await supabase!
    .from('projects')
    .select('sort_order')
    .eq('user_id', userId)
  if (!orderErr) {
    const max = ((rows ?? []) as Array<{ sort_order: number | null }>).reduce(
      (m, r) => (typeof r.sort_order === 'number' ? Math.max(m, r.sort_order) : m),
      -1,
    )
    sortOrder = max + 1
  }
  const { data, error } = await supabase!
    .from('projects')
    .insert({ ...projectRow(input), slug, user_id: userId, ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}) })
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
  for (const [i, file] of files.entries()) {
    const asset = await uploadAsset(file, projectId)
    const kind = input.newAssetKinds?.[i]
    if (kind && kind !== asset.kind) {
      const { error } = await supabase!.from('assets').update({ kind }).eq('id', asset.id)
      if (!error) asset.kind = kind
    }
    uploaded.push(asset)
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
