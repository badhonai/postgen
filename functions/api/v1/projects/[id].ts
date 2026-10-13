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
    })
    await agent.logActivity(ctx.env, auth, 'project.update', { table: 'projects', id }, undefined)
    return Response.json({ project })
  })
}
