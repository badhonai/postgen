import * as agent from '../../../_lib/agentdb'
import { agentRoute, readJson } from '../../../_lib/route'
import type { Env } from '../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string } }

export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) =>
    Response.json({ post: await agent.getPost(ctx.env, auth.userId, ctx.params.id ?? '') }),
  )
}

export function onRequestPatch(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const post = await agent.updateDraft(ctx.env, auth, 'api', ctx.params.id ?? '', {
      title: body.title as string | undefined,
      category: body.category as 'promotional' | undefined,
      type: body.type as agent.PostType | undefined,
      status: body.status as 'idea' | 'draft' | undefined,
      tweets: body.tweets as string[] | undefined,
      tagNames: body.tag_names as string[] | undefined,
      meta: (body.meta as Record<string, unknown> | undefined) ?? undefined,
      allowSimilar: body.allow_similar === true,
    })
    return Response.json({ post })
  })
}
