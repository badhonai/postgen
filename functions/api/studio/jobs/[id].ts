import { getUserFromRequest } from '../../../_lib/auth'
import { jsonError, type Env } from '../../../_lib/env'
import { deleteJob } from '../../../_lib/studio'

type Ctx = { request: Request; env: Env; params: { id?: string } }

/**
 * DELETE /api/studio/jobs/:id — "Clear storage" in the in-app Studio section.
 * Session auth (the browser), removes the R2 objects and the rows.
 */
export async function onRequestDelete(ctx: Ctx): Promise<Response> {
  const user = await getUserFromRequest(ctx.request, ctx.env)
  if (!user) return jsonError('unauthorized', 401)
  try {
    const result = await deleteJob(ctx.env, user.id, ctx.params.id ?? '')
    return Response.json(result)
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500
    return jsonError((error as Error).message, status)
  }
}
