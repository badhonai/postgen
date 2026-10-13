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
    })
    await agent.logActivity(ctx.env, auth, 'project.create', { table: 'projects', id: project.id }, {
      name: project.name,
    })
    return Response.json({ project }, { status: 201 })
  })
}
