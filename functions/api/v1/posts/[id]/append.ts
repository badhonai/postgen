import * as agent from '../../../../_lib/agentdb'
import { agentRoute, readJson } from '../../../../_lib/route'
import type { Env } from '../../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string } }

export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const post = await agent.appendThread(
      ctx.env,
      auth,
      'api',
      ctx.params.id ?? '',
      body.tweets as string[],
      { allowSimilar: body.allow_similar === true },
    )
    return Response.json({ post })
  })
}
