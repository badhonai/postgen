import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { sha256Hex } from '../../lib/text'

export type ApiKeyRow = {
  id: string
  user_id: string
  name: string
  key_hash: string
  prefix: string
  scopes: string[]
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export type AgentActivityRow = {
  id: string
  user_id: string
  key_id: string | null
  action: string
  target_table: string | null
  target_id: string | null
  metadata: unknown
  created_at: string
}

function randomBase64Url(numBytes: number): string {
  const arr = new Uint8Array(numBytes)
  crypto.getRandomValues(arr)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generates the key pair entirely in the browser:
 * the raw `pgk_live_…` key is shown ONCE and never stored —
 * only its SHA-256 hash and display prefix reach the database.
 */
export async function generateApiKey(): Promise<{ key: string; prefix: string; keyHash: string }> {
  const prefix = randomBase64Url(4).slice(0, 8).toLowerCase()
  const secret = randomBase64Url(32)
  const key = `pgk_live_${prefix}_${secret}`
  const keyHash = await sha256Hex(key)
  return { key, prefix, keyHash }
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    enabled: !!supabase,
    queryFn: async (): Promise<ApiKeyRow[]> => {
      const { data, error } = await supabase!
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ApiKeyRow[]
    },
  })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, userId }: { name: string; userId: string }) => {
      const { key, prefix, keyHash } = await generateApiKey()
      const { data, error } = await supabase!
        .from('api_keys')
        .insert({ user_id: userId, name: name.trim() || 'Untitled key', key_hash: keyHash, prefix })
        .select()
        .single()
      if (error) throw error
      return { key, row: data as ApiKeyRow }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useRevokeApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useAgentActivity() {
  return useQuery({
    queryKey: ['agent-activity'],
    enabled: !!supabase,
    queryFn: async (): Promise<AgentActivityRow[]> => {
      const { data, error } = await supabase!
        .from('agent_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12)
      if (error) throw error
      return data as AgentActivityRow[]
    },
  })
}
