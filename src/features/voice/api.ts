import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export type VoiceStatus = {
  configured: boolean
  provider: 'elevenlabs'
  voice_id: string | null
  voice_name: string | null
  daily_limit: number
  per_script_limit: number
  last_tested_at: string | null
  updated_at: string | null
  used_today: number
  remaining_today: number
  /** Present on save/test: a plan/voice mismatch the provider will refuse. */
  warning?: string | null
  category?: string | null
  tier?: string | null
}

export const HOPE_VOICE_ID = 'dmWfLQZJq7wNPv9WmtiM'

/** Every call goes through a Pages Function; the stored key never comes back. */
async function authed(path: string, init: RequestInit = {}): Promise<Response> {
  if (!supabase) throw new Error('Not signed in')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  const response = await fetch(path, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request failed (${response.status})`)
  }
  return response
}

export function useVoiceStatus() {
  return useQuery({
    queryKey: ['voice-status'],
    enabled: !!supabase,
    retry: false,
    queryFn: async (): Promise<VoiceStatus> =>
      (await (await authed('/api/voice/settings')).json()) as VoiceStatus,
  })
}

export function useSaveVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { apiKey: string; voiceId?: string }) =>
      (await (
        await authed('/api/voice/settings', { method: 'POST', body: JSON.stringify(input) })
      ).json()) as VoiceStatus,
    onSuccess: (data) => qc.setQueryData(['voice-status'], data),
  })
}

export function useTestVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      (await (await authed('/api/voice/settings', { method: 'PUT' })).json()) as {
        ok: boolean
        voice_name: string | null
      },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['voice-status'] }),
  })
}

export function useRemoveVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      (await (await authed('/api/voice/settings', { method: 'DELETE' })).json()) as VoiceStatus,
    onSuccess: (data) => qc.setQueryData(['voice-status'], data),
  })
}
