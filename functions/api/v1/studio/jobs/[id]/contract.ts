import { studioRoute } from '../../../../../_lib/route'
import * as studio from '../../../../../_lib/studio'
import type { Env } from '../../../../../_lib/env'

type Ctx = { request: Request; env: Env; params: { id?: string } }

/**
 * GET /api/v1/studio/jobs/:id/contract
 * The specialist's entry point: what this job is, which files to read, which
 * paths it may write back, and where the return lands. Works with the job token.
 */
export function onRequestGet(ctx: Ctx): Promise<Response> {
  return studioRoute(ctx.request, ctx.env, ctx.params.id ?? '', async (job, via) => {
    const origin = new URL(ctx.request.url).origin
    const files = await studio.listJobFiles(ctx.env, job.id, origin)
    const byPath = new Map(files.map((f) => [f.path, f]))
    const contractFile = byPath.get('HANDOFF.json')
    return Response.json({
      via,
      job: { id: job.id, title: job.title, slug: job.slug, status: job.status, spec: job.spec, voice: job.voice_name },
      files: files.map(({ r2_key: _r2, ...rest }) => rest),
      contract: contractFile?.url ? `${origin}/api/v1/studio/jobs/${job.id}/files` : null,
      handoff: {
        read: contractFile ? `${origin}/api/v1/studio/jobs/${job.id}/files` : null,
        prompt: byPath.get('CLAUDE-PROMPT.md')?.url ?? null,
      },
      write: {
        method: 'POST',
        url: `${origin}/api/v1/studio/jobs/${job.id}/files`,
        multipart: ['file', 'path', 'kind=return'],
        allowed_paths: [
          'src/Film.tsx',
          'src/visual-system.ts',
          'src/scenes/*.tsx',
          'src/components/*.tsx',
          'VISUAL-RETURN.md',
        ],
        rejected_paths: [
          'project.json',
          'src/film-data.json',
          'src/timeline.ts',
          'src/Composition.tsx',
          'src/index.tsx',
          'package.json',
          'brand/**',
          'production/**',
        ],
      },
      done: `POST ${origin}/api/v1/studio/jobs/${job.id}/files with path=RENDER-READY.md` +
        ' (or tell the user "done") so the orchestrator renders and posts the draft.',
    })
  })
}
