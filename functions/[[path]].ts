/**
 * Catch-all Pages Function: SPA fallback + route hygiene.
 *
 * - Real static files are served as-is.
 * - Non-file, non-/api paths that would 404 get index.html (React Router
 *   takes over). Deterministic replacement for the classic `_redirects`
 *   rule (`/* /index.html 200`), which wrangler's redirect engine rejects.
 * - `/api/*` unknowns get a JSON 404 (never the HTML app shell).
 * - File-like paths (e.g. /missing.css) get a plain 404 — never HTML.
 *
 * The dev asset server sometimes SPA-serves unknown paths itself; we detect
 * that (200 + text/html for api/file paths) and normalize it, so local and
 * production behavior match exactly.
 *
 * Specific routes like /api/health.ts take precedence over this catch-all.
 */
export async function onRequest(context: {
  request: Request
  env: { ASSETS: { fetch: (input: Request | URL) => Promise<Response> } }
}): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const isApi = url.pathname.startsWith('/api/')
  const looksLikeFile = /\.[^/]+$/.test(url.pathname)

  const asset = await env.ASSETS.fetch(request)

  const contentType = asset.headers.get('content-type') ?? ''
  const isHtml = contentType.includes('text/html')
  // Dev-only quirk: unknown api/file paths answered with the app shell.
  const spaLeak = asset.status === 200 && isHtml && (isApi || looksLikeFile)

  if (asset.status === 404 || spaLeak) {
    if (!isApi && !looksLikeFile) {
      // SPA route → serve the app shell (fetch "/" — index.html itself 308s).
      return env.ASSETS.fetch(new Request(new URL('/', url), { method: 'GET' }))
    }
    if (isApi) {
      return Response.json({ error: 'not_found', path: url.pathname }, { status: 404 })
    }
    return new Response('Not Found', { status: 404 })
  }

  return asset
}
