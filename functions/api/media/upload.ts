import { getUserFromRequest, serviceClient } from '../../_lib/auth'
import { jsonError, type Env } from '../../_lib/env'

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const MAX_IMAGE = 10 * 1024 * 1024 // 10 MB
const MAX_VIDEO = 50 * 1024 * 1024 // 50 MB
const SOFT_CAP_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB / user (free-tier guard)

export async function onRequestPost(
  context: { request: Request; env: Env },
): Promise<Response> {
  const { request, env } = context

  const user = await getUserFromRequest(request, env)
  if (!user) return jsonError('unauthorized', 401)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonError('expected multipart form data')
  }

  const file = form.get('file')
  const projectId = String(form.get('project_id') ?? '')
  if (!(file instanceof File)) return jsonError('missing file')
  if (!projectId) return jsonError('missing project_id')

  const mime = file.type
  const ext = ALLOWED[mime]
  if (!ext) return jsonError(`unsupported type: ${mime || 'unknown'} (images + mp4/webm/mov only)`, 415)

  const isVideo = mime.startsWith('video/')
  const max = isVideo ? MAX_VIDEO : MAX_IMAGE
  if (file.size > max) {
    return jsonError(`file too large (max ${isVideo ? 50 : 10} MB for ${isVideo ? 'video' : 'images'})`, 413)
  }

  const db = serviceClient(env)

  // project must belong to the caller
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!project) return jsonError('project not found', 404)

  // free-tier soft cap per user
  const { data: totals } = await db
    .from('assets')
    .select('size_bytes')
    .eq('user_id', user.id)
  const used = (totals ?? []).reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0)
  if (used + file.size > SOFT_CAP_BYTES) {
    return jsonError('storage soft cap reached (5 GB per user)', 413)
  }

  const stamp = Date.now().toString(36)
  const rand = crypto.randomUUID().slice(0, 8)
  const key = `users/${user.id}/projects/${projectId}/${stamp}-${rand}.${ext}`

  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: mime },
  })

  const width = Number(form.get('width') ?? '') || null
  const height = Number(form.get('height') ?? '') || null

  const { data: asset, error } = await db
    .from('assets')
    .insert({
      user_id: user.id,
      project_id: projectId,
      r2_key: key,
      filename: file.name || `${stamp}.${ext}`,
      mime_type: mime,
      size_bytes: file.size,
      width,
      height,
    })
    .select()
    .single()

  if (error) {
    await env.MEDIA.delete(key).catch(() => undefined)
    return jsonError(error.message, 500)
  }

  return Response.json({ asset }, { status: 201 })
}
