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

const MAX_EDGE = 1920

/** Does this canvas hold any (semi-)transparent pixels? Sampled cheaply. */
function canvasHasAlpha(source: HTMLCanvasElement): boolean {
  try {
    const s = document.createElement('canvas')
    s.width = 48
    s.height = 48
    const sctx = s.getContext('2d', { willReadFrequently: true })
    if (!sctx) return true
    sctx.drawImage(source, 0, 0, 48, 48)
    const data = sctx.getImageData(0, 0, 48, 48).data
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true
    return false
  } catch {
    return true
  }
}

/**
 * Shrink oversized images before upload: cap the long edge at 1920px and
 * re-encode (JPEG 0.85 for opaque photos — typically 5–10× smaller than a
 * camera/poster PNG; PNG kept when the image has transparency, e.g.
 * logos). Small or already-light files pass through untouched.
 */
async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  if (file.size < 700_000) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 1_500_000) return file
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const type = canvasHasAlpha(canvas) ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/jpeg' ? '.jpg' : '.png')
    return new File([blob], name, { type })
  } catch {
    return file
  }
}

export async function uploadAsset(file: File, projectId: string): Promise<Asset> {
  const optimized = await optimizeImage(file)
  const form = new FormData()
  form.append('file', optimized)
  form.append('project_id', projectId)

  if (optimized.type.startsWith('image/')) {
    try {
      const { width, height } = await imageDims(optimized)
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

async function getSignedUrlSingle(key: string): Promise<string> {
  const res = await fetch(`/api/media/sign?key=${encodeURIComponent(key)}`, {
    headers: await authHeaders(),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string; url?: string }
  if (!res.ok || !body.url) throw new Error(body.error ?? `sign failed (${res.status})`)
  return body.url
}

// ── Batched signing ──────────────────────────────────────────────────
// A grid can mount dozens of <img>s at once; signing each one with its
// own request was dozens of round-trips per screen. getSignedUrl now
// collects keys for a beat and signs them all in one /sign-batch call.
type SignWaiter = { resolve: (url: string) => void; reject: (err: unknown) => void }
const signQueue = new Map<string, SignWaiter[]>()
let signTimer: number | null = null

async function flushSignQueue(): Promise<void> {
  signTimer = null
  const batch = new Map(signQueue)
  signQueue.clear()
  const keys = [...batch.keys()]
  if (keys.length === 0) return
  const failAll = (err: unknown) => {
    for (const waiters of batch.values()) for (const w of waiters) w.reject(err)
  }
  try {
    const res = await fetch('/api/media/sign-batch', {
      method: 'POST',
      headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    })
    if (res.status === 404) throw new Error('no-batch-endpoint')
    const body = (await res.json().catch(() => ({}))) as { urls?: Record<string, string>; error?: string }
    if (!res.ok) throw new Error(body.error ?? `sign failed (${res.status})`)
    for (const [key, waiters] of batch) {
      const url = body.urls?.[key]
      if (url) for (const w of waiters) w.resolve(url)
      else for (const w of waiters) w.reject(new Error('could not sign asset'))
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'no-batch-endpoint') {
      // Older deploy without the batch endpoint: sign one by one.
      await Promise.all(
        [...batch].map(async ([key, waiters]) => {
          try {
            const url = await getSignedUrlSingle(key)
            for (const w of waiters) w.resolve(url)
          } catch (e) {
            for (const w of waiters) w.reject(e)
          }
        }),
      )
      return
    }
    failAll(err)
  }
}

export function getSignedUrl(key: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const waiters = signQueue.get(key) ?? []
    waiters.push({ resolve, reject })
    signQueue.set(key, waiters)
    if (signTimer === null) {
      signTimer = window.setTimeout(() => void flushSignQueue(), 20)
    }
  })
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
