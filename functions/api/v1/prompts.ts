import * as agent from '../../_lib/agentdb'
import { agentRoute, readJson } from '../../_lib/route'
import type { Env } from '../../_lib/env'

type Ctx = { request: Request; env: Env }

/**
 * GET /api/v1/prompts
 * The user's saved image prompts. cover_assets (signed URLs) show how
 * each prompt's output looks — preview only. reference_assets is ONLY
 * populated when the prompt's use_reference_images flag is on; agents
 * must not feed covers to an image model otherwise. color_codes is the
 * optional hex palette to generate with.
 */
export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const url = new URL(ctx.request.url)
    const prompts = await agent.listImagePrompts(ctx.env, auth.userId, url.origin, {
      projectId: url.searchParams.get('project_id') ?? undefined,
    })
    return Response.json({ image_prompts: prompts })
  })
}

/** POST /api/v1/prompts — save a new prompt (optionally with reference assets). */
export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const prompt = await agent.createImagePrompt(ctx.env, auth, 'api', {
      name: body.name,
      prompt: body.prompt,
      notes: body.notes,
      referenceAssetIds: body.reference_asset_ids,
      projectIds: body.project_ids,
      useReferenceImages: body.use_reference_images,
      colorCodes: body.color_codes,
    })
    return Response.json({ image_prompt: prompt }, { status: 201 })
  })
}
