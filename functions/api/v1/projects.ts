import * as agent from '../../_lib/agentdb'
import { agentRoute, readJson } from '../../_lib/route'
import type { Env } from '../../_lib/env'

type Ctx = { request: Request; env: Env }

export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) =>
    Response.json({ projects: await agent.listProjects(ctx.env, auth.userId) }),
  )
}

export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const project = await agent.createProject(ctx.env, auth.userId, {
      name: body.name as string | undefined,
      description: body.description as string | undefined,
      brand_voice: body.brand_voice,
      x_username: body.x_username as string | undefined,
      x_premium: body.x_premium as boolean | undefined,
      website_url: body.website_url as string | undefined,
      content_pillars: body.content_pillars as string[] | undefined,
      sample_posts: body.sample_posts as string[] | undefined,
      custom_instructions: body.custom_instructions as string | undefined,
      official_links: body.official_links,
    })
    await agent.logActivity(ctx.env, auth, 'rest', 'project.create', { table: 'projects', id: project.id }, {
      name: project.name,
    })
    return Response.json({ project }, { status: 201 })
  })
}
