import { studioRoute } from '../../../../../../_lib/route'
import * as studio from '../../../../../../_lib/studio'
import type { Env } from '../../../../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string; fileId?: string } }

/** DELETE /api/v1/studio/jobs/:id/files/:fileId -> drop one file from the folder. */
export function onRequestDelete(ctx: Ctx): Promise<Response> {
  return studioRoute(ctx.request, ctx.env, ctx.params.id ?? '', async (job) => {
    const result = await studio.deleteJobFile(ctx.env, job.user_id, job.id, ctx.params.fileId ?? '')
    return Response.json(result)
  })
}
