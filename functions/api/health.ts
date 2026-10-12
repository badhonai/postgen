/**
 * GET /api/health — liveness probe for Cloudflare Pages Functions.
 * Free-tier friendly: no DB, no bindings, pure JSON.
 */
export async function onRequestGet(): Promise<Response> {
  return Response.json({
    ok: true,
    service: 'postgen',
    milestone: 'm0',
    time: new Date().toISOString(),
  })
}
