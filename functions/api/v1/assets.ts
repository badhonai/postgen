import * as agent from '../../_lib/agentdb'
import { agentRoute } from '../../_lib/route'
import type { Env } from '../../_lib/env'

type Ctx = { request: Request; env: Env }

/**
 * GET /api/v1/assets?project_id=<uuid>
 * Lists the caller's media. Each asset carries a short-lived signed URL
 * so the agent can fetch and actually look at the image.
 */
export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const url = new URL(ctx.request.url)
    const projectId = url.searchParams.get('project_id') ?? undefined
    const assets = await agent.listAssets(ctx.env, auth.userId, {
      projectId,
      kind: url.searchParams.get('kind') ?? undefined,
      origin: url.origin,
    })
    return Response.json({ assets })
  })
}
