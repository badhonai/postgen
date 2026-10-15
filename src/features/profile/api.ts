import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * X Premium is a USER-level setting (Settings page), default ON.
 * It drives the character limit (25,000 vs 280) in the composer and
 * in every agent write, for all of the user's projects at once.
 * profiles.x_premium is the source of truth; projects.x_premium is
 * a database-synced mirror.
 */
export function useXPremium() {
  return useQuery({
    queryKey: ['x-premium'],
    enabled: !!supabase,
    queryFn: async (): Promise<boolean> => {
      const { data: auth } = await supabase!.auth.getUser()
      if (!auth.user) return true
      const { data, error } = await supabase!
        .from('profiles')
        .select('x_premium')
        .eq('id', auth.user.id)
        .maybeSingle()
      // Table/column not there yet (migration pending) → default ON.
      if (error) return true
      return (data as { x_premium?: boolean } | null)?.x_premium ?? true
    },
  })
}

export function useSetXPremium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (xPremium: boolean): Promise<void> => {
      const { data: auth } = await supabase!.auth.getUser()
      if (!auth.user) throw new Error('You are signed out.')
      const { error } = await supabase!
        .from('profiles')
        .update({ x_premium: xPremium })
        .eq('id', auth.user.id)
      if (error) throw error
      // Mirror immediately too (the DB trigger also does this), so the
      // composer limit updates without waiting for anything else.
      await supabase!.from('projects').update({ x_premium: xPremium }).eq('user_id', auth.user.id)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['x-premium'] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
