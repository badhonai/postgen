import * as agent from '../../_lib/agentdb'
import { agentRoute } from '../../_lib/route'
import type { Env } from '../../_lib/env'

type Ctx = { request: Request; env: Env }

/**
 * GET /api/v1/prompts
 * The user's saved image prompts, each with its reference images resolved
 * to short-lived signed URLs. The prompt text and the reference images are
 * meant to be used together — the words say what to make, the images show
 * the style it should come out in.
 */
export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const prompts = await agent.listImagePrompts(ctx.env, auth.userId, new URL(ctx.request.url).origin)
    return Response.json({ image_prompts: prompts })
  })
}
