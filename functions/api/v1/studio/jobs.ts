import { serviceClient } from '../../../_lib/auth'
import { agentRoute, readJson } from '../../../_lib/route'
import * as studio from '../../../_lib/studio'
import type { Env } from '../../../_lib/env'

type Ctx = { request: Request; env: Env }

/**
 * GET  /api/v1/studio/jobs  → every job folder with file counts and size
 * POST /api/v1/studio/jobs  → create a job folder; returns its scoped token once
 */
export function onRequestGet(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const url = new URL(ctx.request.url)
    const jobs = await studio.listJobs(ctx.env, auth.userId, url.origin)
    const db = serviceClient(ctx.env)
    const ids = [...new Set(jobs.map((j) => j.project_id).filter(Boolean))]
    const names = new Map<string, string>()
    if (ids.length) {
      const { data } = await db.from('projects').select('id, name').in('id', ids as string[])
      for (const row of (data ?? []) as Array<{ id: string; name: string }>) names.set(row.id, row.name)
    }
    return Response.json({
      jobs: jobs.map((j) => ({ ...j, project_name: j.project_id ? names.get(j.project_id) ?? null : null })),
    })
  })
}

export function onRequestPost(ctx: Ctx): Promise<Response> {
  return agentRoute(ctx.request, ctx.env, async (auth) => {
    const body = await readJson(ctx.request)
    const { job, token } = await studio.createJob(ctx.env, auth.userId, {
      title: String(body.title ?? body.slug ?? ''),
      projectId: (body.project_id as string | undefined) ?? null,
      slug: body.slug as string | undefined,
      voiceId: (body.voice_id as string | undefined) ?? null,
      voiceName: (body.voice_name as string | undefined) ?? null,
      spec: (body.spec as Record<string, unknown> | undefined) ?? {},
      note: body.note as string | undefined,
    })
    return Response.json(
      {
        job,
        // Shown once. It only unlocks this job's files — not the account.
        token,
        hint: 'Hand this token to the visual specialist in the prompt; it can only reach this job folder.',
      },
      { status: 201 },
    )
  })
}
