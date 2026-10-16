import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Global instructions (Settings): account-wide writing rules that apply
 * to every project — agents receive them inside get_project as
 * `global_instructions`; each project's own custom instructions add
 * project-specific rules on top.
 */
export function useGlobalInstructions() {
  return useQuery({
    queryKey: ['global-instructions'],
    enabled: !!supabase,
    queryFn: async (): Promise<string> => {
      const { data: auth } = await supabase!.auth.getUser()
      if (!auth.user) return ''
      const { data, error } = await supabase!
        .from('profiles')
        .select('global_instructions')
        .eq('id', auth.user.id)
        .maybeSingle()
      // Column not there yet (migration pending) → treat as empty; the
      // save path surfaces the real error with a hint.
      if (error) return ''
      return ((data as { global_instructions?: string | null } | null)?.global_instructions ?? '') as string
    },
  })
}

export function useSetGlobalInstructions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (text: string): Promise<void> => {
      const { data: auth } = await supabase!.auth.getUser()
      if (!auth.user) throw new Error('You are signed out.')
      const { error } = await supabase!
        .from('profiles')
        .update({ global_instructions: text.trim() || null })
        .eq('id', auth.user.id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['global-instructions'] }),
  })
}
