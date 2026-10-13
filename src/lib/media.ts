import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Asset } from './types'

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase!.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('not signed in')
  return { Authorization: `Bearer ${token}` }
}

function imageDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('could not read image'))
    }
    img.src = url
  })
}

export async function uploadAsset(file: File, projectId: string): Promise<Asset> {
  const form = new FormData()
  form.append('file', file)
  form.append('project_id', projectId)

  if (file.type.startsWith('image/')) {
    try {
      const { width, height } = await imageDims(file)
      form.append('width', String(width))
      form.append('height', String(height))
    } catch {
      /* dimensions are optional */
    }
  }

  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers: await authHeaders(),
    body: form,
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string; asset?: Asset }
  if (!res.ok || !body.asset) throw new Error(body.error ?? `upload failed (${res.status})`)
  return body.asset
}

export async function getSignedUrl(key: string): Promise<string> {
  const res = await fetch(`/api/media/sign?key=${encodeURIComponent(key)}`, {
    headers: await authHeaders(),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string; url?: string }
  if (!res.ok || !body.url) throw new Error(body.error ?? `sign failed (${res.status})`)
  return body.url
}

export async function deleteAsset(key: string): Promise<void> {
  const res = await fetch('/api/media/delete', {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(body.error ?? `delete failed (${res.status})`)
}

/** Short-lived signed URL for an asset (cached for ~4 min). */
export function useAssetUrl(key: string | null | undefined) {
  return useQuery({
    queryKey: ['asset-url', key],
    enabled: !!key && !!supabase,
    queryFn: () => getSignedUrl(key!),
    staleTime: 4 * 60 * 1000,
  })
}

export function useProjectAssets(projectId: string) {
  return useQuery({
    queryKey: ['assets', projectId],
    enabled: !!supabase && !!projectId,
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase!
        .from('assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Asset[]
    },
  })
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a
}

/** "16:9" / "1:1" when reducible, else raw pixel size. */
export function aspectLabel(asset: Asset): string | null {
  if (!asset.width || !asset.height) return null
  const d = gcd(asset.width, asset.height)
  const w = asset.width / d
  const h = asset.height / d
  return w <= 24 && h <= 24 ? `${w}:${h}` : `${asset.width}×${asset.height}`
}
