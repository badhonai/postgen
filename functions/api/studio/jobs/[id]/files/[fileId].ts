import { getUserFromRequest } from '../../../../../_lib/auth'
import { jsonError, type Env } from '../../../../../_lib/env'
import { deleteJobFile } from '../../../../../_lib/studio'

type Ctx = { request: Request; env: Env; params: { id?: string; fileId?: string } }

/** DELETE /api/studio/jobs/:id/files/:fileId — drop one working file. */
export async function onRequestDelete(ctx: Ctx): Promise<Response> {
  const user = await getUserFromRequest(ctx.request, ctx.env)
  if (!user) return jsonError('unauthorized', 401)
  try {
    const result = await deleteJobFile(ctx.env, user.id, ctx.params.id ?? '', ctx.params.fileId ?? '')
    return Response.json(result)
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500
    return jsonError((error as Error).message, status)
  }
}
