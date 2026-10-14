import * as agent from '../../../_lib/agentdb'
import { agentRoute, readJson } from '../../../_lib/route'
import type { Env } from '../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string } }

export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const id = ctx.params.id ?? ''
    return Response.json({ project: await agent.getProject(ctx.env, auth.userId, id) })
  })
}

export function onRequestPatch(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const id = ctx.params.id ?? ''
    const body = await readJson(ctx.request)
    const project = await agent.updateProject(ctx.env, auth.userId, id, {
      name: body.name as string | undefined,
      description: body.description as string | undefined,
      brand_voice: body.brand_voice,
      x_username: body.x_username as string | undefined,
      website_url: body.website_url as string | undefined,
      content_pillars: body.content_pillars as string[] | undefined,
      sample_posts: body.sample_posts as string[] | undefined,
      custom_instructions: body.custom_instructions as string | undefined,
      official_links: body.official_links,
    })
    await agent.logActivity(ctx.env, auth, 'rest', 'project.update', { table: 'projects', id }, undefined)
    return Response.json({ project })
  })
}
