import { agentRoute, readJson } from '../../../../_lib/route'
import * as studio from '../../../../_lib/studio'
import type { Env } from '../../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string } }

/** GET /api/v1/studio/jobs/:id → the job plus every file with a short-lived URL. */
export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const job = await studio.getJob(ctx.env, auth.userId, ctx.params.id ?? '')
    const origin = new URL(ctx.request.url).origin
    const files = await studio.listJobFiles(ctx.env, job.id, origin)
    const total = files.reduce((n, f) => n + (f.size_bytes ?? 0), 0)
    return Response.json({
      job,
      files: files.map(({ r2_key: _r2, ...rest }) => rest),
      total_bytes: total,
    })
  })
}

/** PATCH /api/v1/studio/jobs/:id → rename, note, or move status by hand. */
export function onRequestPatch(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const job = await studio.updateJob(ctx.env, auth.userId, ctx.params.id ?? '', {
      title: body.title as string | undefined,
      note: body.note as string | undefined,
      status: body.status as string | undefined,
    })
    return Response.json({ job })
  })
}

/** DELETE /api/v1/studio/jobs/:id → wipe the folder (R2 objects + rows). */
export function onRequestDelete(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const result = await studio.deleteJob(ctx.env, auth.userId, ctx.params.id ?? '')
    return Response.json(result)
  })
}
