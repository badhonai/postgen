import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { BrandVoice, Project } from '../../lib/types'

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

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    enabled: !!supabase,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase!
        .from('projects')
        .select('*')
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
        .select('*')
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
}

async function insertProject(input: ProjectInput, slug: string): Promise<Project> {
  const { data, error } = await supabase!
    .from('projects')
    .insert({
      name: input.name.trim(),
      slug,
      description: input.description.trim() || null,
      brand_voice: input.brandVoice,
    })
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
        .update({
          name: input.name.trim(),
          description: input.description.trim() || null,
          brand_voice: input.brandVoice,
        })
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
