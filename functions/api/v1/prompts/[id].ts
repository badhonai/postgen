import * as agent from '../../../_lib/agentdb'
import { agentRoute, readJson } from '../../../_lib/route'
import type { Env } from '../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string } }

/**
 * PATCH /api/v1/prompts/:id — replace a prompt. Like the MCP update tool this
 * is a whole-object write: name, prompt, notes and reference_asset_ids are all
 * overwritten, so the caller sends the full intended values.
 */
export function onRequestPatch(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const prompt = await agent.updateImagePrompt(ctx.env, auth, 'api', ctx.params.id ?? '', {
      name: body.name,
      prompt: body.prompt,
      notes: body.notes,
      referenceAssetIds: body.reference_asset_ids,
    })
    return Response.json({ image_prompt: prompt })
  })
}

/** DELETE /api/v1/prompts/:id */
export function onRequestDelete(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const removed = await agent.deleteImagePrompt(ctx.env, auth, 'api', ctx.params.id ?? '')
    return Response.json({ deleted: removed })
  })
}
