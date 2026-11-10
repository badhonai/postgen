import * as agent from '../../../_lib/agentdb'
import { agentRoute, readJson } from '../../../_lib/route'
import type { Env } from '../../../_lib/env'
import { runVoiceover } from '../../../_lib/voice'

type Ctx = { request: Request; env: Env }

/**
 * POST /api/v1/voice/generate  (agent API key)
 * { project_id, text, voice_id? }
 *
 * Spends the owner's provider credits, so it is capped in _lib/voice.ts:
 *   · 20 successes per UTC day per account (voice_settings.daily_limit)
 *   · 2 successes per identical script within 24h (per_script_limit)
 */
export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const outcome = await runVoiceover(ctx.env, auth, {
      projectId: String(body.project_id ?? ''),
      text: String(body.text ?? ''),
      voiceId: typeof body.voice_id === 'string' ? body.voice_id : undefined,
    })
    if (outcome.status === 201) {
      await agent.logActivity(
        ctx.env,
        auth,
        'rest',
        'generate_voiceover',
        { table: 'assets', id: String(outcome.body.asset_id ?? '') },
        { characters: outcome.body.characters, voice_id: outcome.body.voice_id },
      )
    }
    return Response.json(outcome.body, { status: outcome.status })
  })
}
