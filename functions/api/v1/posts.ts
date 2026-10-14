import * as agent from '../../_lib/agentdb'
import { agentRoute, readJson } from '../../_lib/route'
import type { Env } from '../../_lib/env'

type Ctx = { request: Request; env: Env }

export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const url = new URL(ctx.request.url)
    const posts = await agent.listPosts(ctx.env, auth.userId, {
      projectId: url.searchParams.get('project_id') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      type: url.searchParams.get('type') ?? undefined,
    })
    return Response.json({ posts })
  })
}

export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const post = await agent.createDraft(ctx.env, auth, 'api', {
      projectId: body.project_id as string | undefined,
      title: body.title as string | undefined,
      category: body.category as 'promotional' | undefined,
      type: body.type as agent.PostType | undefined,
      status: body.status as 'idea' | 'draft' | undefined,
      tweets: body.tweets as string[],
      tagNames: body.tag_names as string[] | undefined,
      meta: (body.meta as Record<string, unknown> | undefined) ?? undefined,
      allowSimilar: body.allow_similar === true,
    })
    return Response.json({ post }, { status: 201 })
  })
}
