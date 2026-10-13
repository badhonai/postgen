import * as agent from '../../_lib/agentdb'
import { agentRoute, readJson } from '../../_lib/route'
import type { Env } from '../../_lib/env'

type Ctx = { request: Request; env: Env }

export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const knowledge = await agent.addKnowledge(ctx.env, auth, {
      projectId: body.project_id as string | undefined,
      kind: body.kind as 'knowledge' | 'source' | undefined,
      title: body.title as string | undefined,
      content: body.content as string | undefined,
      url: body.url as string | undefined,
      notes: body.notes as string | undefined,
    })
    return Response.json({ knowledge }, { status: 201 })
  })
}
