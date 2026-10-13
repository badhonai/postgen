/**
 * GET /api/xprofile?handle=screen_name
 *
 * Proxies public X profile stats from FxTwitter (free community API, no key)
 * so the browser can read them — api.fxtwitter.com sends no CORS headers.
 * No X API, no paid anything. Cached 6h at the edge.
 */
const HANDLE = /^[A-Za-z0-9_]{1,15}$/

export async function onRequestGet({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url)
  const handle = (url.searchParams.get('handle') ?? '').replace(/^@/, '').trim()
  if (!HANDLE.test(handle)) {
    return Response.json({ error: 'bad_handle' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': 'PostGen/1.0 (free profile card)' },
    })
  } catch {
    return Response.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (upstream.status === 404) return Response.json({ error: 'not_found' }, { status: 404 })
  if (!upstream.ok) return Response.json({ error: 'upstream' }, { status: 502 })

  const body = (await upstream.json()) as {
    user?: {
      screen_name?: string
      name?: string
      description?: string
      avatar_url?: string
      banner_url?: string
      followers?: number
      following?: number
      tweets?: number
      likes?: number
      media_count?: number
      joined?: string
      location?: string
      website?: string | { url?: string; display_url?: string } | null
      protected?: string | boolean
      verification?: { verified?: boolean }
    }
  }
  const u = body.user
  if (!u?.screen_name) return Response.json({ error: 'not_found' }, { status: 404 })

  const website =
    typeof u.website === 'string'
      ? u.website || null
      : u.website && typeof u.website === 'object'
        ? u.website.url || null
        : null
  const location = typeof u.location === 'string' ? u.location || null : null
  const bio = typeof u.description === 'string' ? u.description : ''

  return Response.json(
    {
      handle: u.screen_name,
      name: typeof u.name === 'string' ? u.name : u.screen_name,
      bio,
      avatarUrl: u.avatar_url ?? null,
      bannerUrl: u.banner_url ?? null,
      followers: u.followers ?? 0,
      following: u.following ?? 0,
      tweets: u.tweets ?? 0,
      likes: u.likes ?? 0,
      mediaCount: u.media_count ?? 0,
      joined: typeof u.joined === 'string' ? u.joined : null,
      location,
      website,
      verified: Boolean(u.verification?.verified),
      protectedAccount: String(u.protected) === 'True' || u.protected === true,
    },
    { headers: { 'Cache-Control': 'public, max-age=21600' } },
  )
}
