/**
 * Sorsa Score — crypto-X influence score (who follows you: KOLs, projects,
 * funds), fetched via our /api/sorsa proxy. The Sorsa API key is a Pages
 * secret; the browser only ever sees the finished score.
 */

export type SorsaResult = { handle: string; score: number }

export class SorsaError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export async function fetchSorsaScore(handle: string): Promise<SorsaResult> {
  const res = await fetch(`/api/sorsa?handle=${encodeURIComponent(handle.replace(/^@/, ''))}`)
  const body = (await res.json().catch(() => ({}))) as { error?: string; handle?: string; score?: number }
  if (!res.ok) {
    switch (body.error) {
      case 'not_configured':
        throw new SorsaError('not_configured', 'Sorsa Score is not connected yet.')
      case 'not_indexed':
        throw new SorsaError('not_indexed', `@${handle} isn't indexed by Sorsa yet.`)
      case 'quota':
        throw new SorsaError('quota', 'Sorsa free quota reached — try again tomorrow.')
      case 'upstream_auth':
        throw new SorsaError('upstream_auth', 'Sorsa rejected the API key — check SORSA_API_KEY.')
      default:
        throw new SorsaError('upstream', 'Could not load the Sorsa Score right now.')
    }
  }
  return { handle: body.handle ?? handle, score: typeof body.score === 'number' ? body.score : 0 }
}

/** Tiers per sorsa.io: Unknown → Noted → Credible → Significant → Supreme. */
export function sorsaTier(score: number): { label: string; floor: number; nextAt: number | null } {
  if (score >= 2000) return { label: 'Supreme', floor: 2000, nextAt: null }
  if (score >= 1000) return { label: 'Significant', floor: 1000, nextAt: 2000 }
  if (score >= 500) return { label: 'Credible', floor: 500, nextAt: 1000 }
  if (score >= 100) return { label: 'Noted', floor: 100, nextAt: 500 }
  return { label: 'Unknown', floor: 0, nextAt: 100 }
}

export function formatSorsaScore(score: number): string {
  return Number.isInteger(score)
    ? score.toLocaleString('en-US')
    : score.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
