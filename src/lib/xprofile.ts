/**
 * X profile data — fetched from our free /api/xprofile proxy (FxTwitter
 * public data). No X API, no keys, no cost. The profile score is computed
 * locally and transparently from public stats.
 */

export type XProfile = {
  handle: string
  name: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
  followers: number
  following: number
  tweets: number
  likes: number
  mediaCount: number
  joined: string | null
  location: string | null
  website: string | null
  verified: boolean
  protectedAccount: boolean
}

export async function fetchXProfile(handle: string): Promise<XProfile> {
  const res = await fetch(`/api/xprofile?handle=${encodeURIComponent(handle.replace(/^@/, ''))}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    if (body.error === 'not_found') throw new Error(`@${handle} was not found on X.`)
    if (body.error === 'bad_handle') throw new Error('That does not look like an X handle.')
    throw new Error('Could not load X profile right now.')
  }
  const raw = (await res.json()) as Record<string, unknown>
  // Harden against odd shapes (and stale cached proxy responses): every
  // rendered field must be a primitive.
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  const strOrNull = (v: unknown): string | null => {
    if (typeof v === 'string') return v || null
    if (v && typeof v === 'object' && 'url' in v) return str((v as { url?: unknown }).url) || null
    return null
  }
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    handle: str(raw.handle) || handle,
    name: str(raw.name) || str(raw.handle) || handle,
    bio: str(raw.bio),
    avatarUrl: strOrNull(raw.avatarUrl),
    bannerUrl: strOrNull(raw.bannerUrl),
    followers: num(raw.followers),
    following: num(raw.following),
    tweets: num(raw.tweets),
    likes: num(raw.likes),
    mediaCount: num(raw.mediaCount),
    joined: strOrNull(raw.joined),
    location: strOrNull(raw.location),
    website: strOrNull(raw.website),
    verified: Boolean(raw.verified),
    protectedAccount: Boolean(raw.protectedAccount),
  }
}

export type ScorePart = { key: string; label: string; points: number; max: number }

export type XScore = { total: number; label: string; parts: ScorePart[] }

const logCap = (value: number, max: number, ceiling: number): number =>
  Math.min(max, Math.round((Math.log10(value + 1) / Math.log10(ceiling + 1)) * max))

/**
 * Transparent 0–100 "X profile score" from public stats only:
 * reach (40) · follower ratio (20) · activity (20) · profile completeness (20).
 */
export function xProfileScore(p: XProfile): XScore {
  const reach = logCap(p.followers, 40, 1_000_000)
  const ratio = p.followers / Math.max(1, p.following)
  const ratioPts = Math.min(20, Math.round((Math.log10(ratio + 1) / Math.log10(201)) * 20))
  const activity = logCap(p.tweets, 20, 100_000)

  let complete = 0
  if (p.bio.trim()) complete += 10
  if (p.name.trim()) complete += 3
  if (p.location) complete += 3
  if (p.website) complete += 2
  if (p.mediaCount > 0) complete += 2

  const parts: ScorePart[] = [
    { key: 'reach', label: 'Reach', points: reach, max: 40 },
    { key: 'ratio', label: 'Follower ratio', points: ratioPts, max: 20 },
    { key: 'activity', label: 'Activity', points: activity, max: 20 },
    { key: 'complete', label: 'Profile completeness', points: complete, max: 20 },
  ]
  const total = parts.reduce((s, x) => s + x.points, 0)

  const label =
    total >= 85 ? 'Powerful'
    : total >= 70 ? 'Strong'
    : total >= 55 ? 'Solid'
    : total >= 30 ? 'Building'
    : 'Getting started'

  return { total, label, parts }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return String(n)
}
