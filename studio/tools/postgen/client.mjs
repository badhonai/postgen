/**
 * Minimal PostGen REST client for the motion-graphics studio.
 * The agent key is read from POSTGEN_API_KEY (env only — never a file, never logged).
 */
const BASE = process.env.POSTGEN_BASE_URL || 'https://postgen.pages.dev'
/**
 * Cloudflare's bot filter rejects requests with a missing/non-browser User-Agent
 * (Error 1010 "Access denied"). Node's fetch sends `node`; send an explicit UA.
 */
const UA = process.env.POSTGEN_USER_AGENT ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function apiKey() {
  const key = process.env.POSTGEN_API_KEY
  if (!key || !key.startsWith('pgk_')) {
    throw new Error('Set POSTGEN_API_KEY (pgk_live_…) in the environment. Never write it to a file.')
  }
  return key
}

export async function pg(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey()}`,
      accept: 'application/json',
      'user-agent': UA,
      ...(init.body && typeof init.body === 'string' ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  if (response.status === 403 && /1010/.test(text)) {
    throw new Error(
      'PostGen/Cloudflare blocked the request (1010). Set POSTGEN_USER_AGENT to a browser string and retry.',
    )
  }
  if (!response.ok) {
    const detail = body?.detail ? ` — ${body.detail}` : ''
    throw new Error(`PostGen ${path} → ${response.status} ${body?.error || ''}${detail}`)
  }
  return body
}

export const listProjects = () => pg('/api/v1/projects')
export const listAssets = (projectId) =>
  pg(`/api/v1/assets${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''}`)

export function generateVoiceover(projectId, text, {voiceId, dryRun} = {}) {
  return pg('/api/v1/voice/generate', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      text,
      ...(voiceId ? { voice_id: voiceId } : {}),
      ...(dryRun ? { dry_run: true } : {}),
    }),
  })
}

export const listVoices = () => pg('/api/voice/voices')

/** Signed media URLs sit behind the same bot filter as the API — send a UA. */
export async function downloadSigned(url) {
  const response = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' } })
  if (!response.ok) throw new Error(`download failed: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

export async function uploadAsset(projectId, filePath, mime, meta = {}) {
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(filePath)
  const form = new FormData()
  form.set('project_id', projectId)
  form.set('file', new Blob([bytes], { type: mime }), filePath.split('/').pop())
  if (meta.width) form.set('width', String(meta.width))
  if (meta.height) form.set('height', String(meta.height))
  return pg('/api/v1/assets/upload', { method: 'POST', body: form })
}

export function createDraftPost({ projectId, title, tweets, assetId, category = 'promotional', type = 'artwork' }) {
  return pg('/api/v1/posts', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      title,
      category,
      type,
      status: 'draft',
      tweets,
      media: assetId ? [{ asset_id: assetId, tweet_position: 1 }] : undefined,
    }),
  })
}
