import * as agent from '../../../_lib/agentdb'
import { serviceClient } from '../../../_lib/auth'
import { agentRoute, readJson } from '../../../_lib/route'
import { jsonError, type Env } from '../../../_lib/env'

type Ctx = { request: Request; env: Env }

/**
 * POST /api/v1/assets/delete  { asset_id }  (agent API key)
 * Removes the R2 object and the asset row — but refuses while a post still uses it,
 * so a published/draft post can never lose its media by accident.
 */
export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const assetId = String(body.asset_id ?? '')
    if (!assetId) return jsonError('asset_id is required')

    const db = serviceClient(ctx.env)
    const { data: asset } = await db
      .from('assets')
      .select('id, r2_key')
      .eq('id', assetId)
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (!asset) return jsonError('asset not found', 404)

    const { count } = await db
      .from('post_media')
      .select('post_tweet_id', { count: 'exact', head: true })
      .eq('asset_id', assetId)
    if ((count ?? 0) > 0) {
      return jsonError('asset is attached to a post; detach it first', 409)
    }

    await ctx.env.MEDIA.delete(String((asset as { r2_key: string }).r2_key))
    const { error } = await db.from('assets').delete().eq('id', assetId).eq('user_id', auth.userId)
    if (error) return jsonError(error.message, 500)
    await agent.logActivity(ctx.env, auth, 'rest', 'delete_asset', { table: 'assets', id: assetId })
    return Response.json({ deleted: assetId })
  })
}
