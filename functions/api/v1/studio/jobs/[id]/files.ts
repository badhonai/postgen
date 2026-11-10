import { studioRoute } from '../../../../../_lib/route'
import * as studio from '../../../../../_lib/studio'
import { jsonError, type Env } from '../../../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string } }

/**
 * GET  /api/v1/studio/jobs/:id/files  -> list the folder with short-lived URLs
 * POST /api/v1/studio/jobs/:id/files  -> upload ONE file (multipart: file, path, kind)
 *
 * Accepts the owner's API key or the job's scoped token.
 */
export function onRequestGet(ctx: Ctx): Promise<Response> {
  return studioRoute(ctx.request, ctx.env, ctx.params.id ?? '', async (job) => {
    const origin = new URL(ctx.request.url).origin
    const files = await studio.listJobFiles(ctx.env, job.id, origin)
    return Response.json({
      job: { id: job.id, title: job.title, status: job.status },
      files: files.map(({ r2_key: _r2, ...rest }) => rest),
      total_bytes: files.reduce((n, f) => n + (f.size_bytes ?? 0), 0),
    })
  })
}

export function onRequestPost(ctx: Ctx): Promise<Response> {
  return studioRoute(ctx.request, ctx.env, ctx.params.id ?? '', async (job) => {
    const form = await ctx.request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return jsonError('missing file (multipart field "file")')
    const path = String(form.get('path') ?? file.name ?? '')
    const saved = await studio.putJobFile(ctx.env, job, {
      path,
      kind: String(form.get('kind') ?? 'handoff'),
      file,
    })
    return Response.json({ file: saved }, { status: 201 })
  })
}
