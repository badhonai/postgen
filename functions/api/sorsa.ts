import type { Env } from '../_lib/env'

/**
 * GET /api/sorsa?handle=screen_name
 *
 * Proxies the Sorsa Score (crypto-X influence: KOL/project/fund followers,
 * formerly TweetScout) from the Sorsa API. The API needs a key, so the key
 * lives ONLY here as the Pages secret SORSA_API_KEY — never in the browser.
 *
 * Free-tier discipline: Sorsa gives 100 free API requests (no expiry) and
 * scores update daily, so responses are cached for 24h. One profile view
 * costs at most one upstream request per account per day.
 *
 * No key configured → 503 { error: "not_configured" } and the Profile page
 * shows setup instructions instead of a broken card.
 */
const HANDLE = /^[A-Za-z0-9_]{1,15}$/

export async function onRequestGet({
  request,
  env,
}: {
  request: Request
  env: Env
}): Promise<Response> {
  const url = new URL(request.url)
  const handle = (url.searchParams.get('handle') ?? '').replace(/^@/, '').trim()
  if (!HANDLE.test(handle)) {
    return Response.json({ error: 'bad_handle' }, { status: 400 })
  }

  const apiKey = env.SORSA_API_KEY?.trim()
  if (!apiKey) {
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `https://api.sorsa.io/v3/score?username=${encodeURIComponent(handle)}`,
      {
        headers: { ApiKey: apiKey, 'User-Agent': 'PostGen/1.0 (Sorsa score card)' },
        signal: AbortSignal.timeout(20_000),
      },
    )
  } catch {
    return Response.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (upstream.status === 404) {
    // Sorsa has not indexed this account yet (new / no crypto followers found)
    return Response.json({ error: 'not_indexed' }, { status: 404 })
  }
  if (upstream.status === 401 || upstream.status === 403) {
    return Response.json({ error: 'upstream_auth' }, { status: 502 })
  }
  if (upstream.status === 429) {
    return Response.json({ error: 'quota' }, { status: 429 })
  }
  if (!upstream.ok) {
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  const body = (await upstream.json().catch(() => null)) as { score?: unknown } | null
  const score = typeof body?.score === 'number' && Number.isFinite(body.score) ? body.score : null
  if (score === null) {
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  return Response.json(
    { handle, score },
    { headers: { 'Cache-Control': 'public, max-age=86400' } },
  )
}
