import { serviceClient } from '../../../_lib/auth'
import { agentRoute } from '../../../_lib/route'
import { jsonError, type Env } from '../../../_lib/env'

type Ctx = { request: Request; env: Env }

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

const MAX_IMAGE = 10 * 1024 * 1024
const MAX_VIDEO = 50 * 1024 * 1024

/** API-key variant of /api/media/upload (multipart: file, project_id). */
export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const form = await ctx.request.formData()
    const file = form.get('file')
    const projectId = String(form.get('project_id') ?? '')
    if (!(file instanceof File)) return jsonError('missing file')
    if (!projectId) return jsonError('missing project_id')

    const mime = file.type
    const ext = ALLOWED[mime]
    if (!ext) return jsonError(`unsupported type: ${mime || 'unknown'}`, 415)
    const max = mime.startsWith('video/') ? MAX_VIDEO : MAX_IMAGE
    if (file.size > max) return jsonError('file too large', 413)

    const db = serviceClient(ctx.env)
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (!project) return jsonError('project not found', 404)

    const stamp = Date.now().toString(36)
    const rand = crypto.randomUUID().slice(0, 8)
    const key = `users/${auth.userId}/projects/${projectId}/${stamp}-${rand}.${ext}`

    await ctx.env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: mime },
    })

    const { data: asset, error } = await db
      .from('assets')
      .insert({
        user_id: auth.userId,
        project_id: projectId,
        r2_key: key,
        filename: file.name || `${stamp}.${ext}`,
        mime_type: mime,
        size_bytes: file.size,
      })
      .select()
      .single()
    if (error) {
      await ctx.env.MEDIA.delete(key).catch(() => undefined)
      return jsonError(error.message, 500)
    }

    await agent.logActivity(
      ctx.env,
      auth,
      'asset.upload',
      { table: 'assets', id: asset.id },
      { filename: asset.filename },
    )
    return Response.json({ asset }, { status: 201 })
  })
}
