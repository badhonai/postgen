/**
 * Text utilities for posts: X-style weighted length, no-repeat normalization,
 * and content hashing (sha256) for exact-duplicate detection.
 */

/** Matches URLs — each counts as 23 chars on X regardless of length. */
const URL_RE = /https?:\/\/\S+/g

/** Code-point ranges that count as 2 units (CJK, fullwidth forms, emoji). */
const WIDE_RANGES: Array<[number, number]> = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f004, 0x1f004],
  [0x1f0cf, 0x1f0cf],
  [0x1f18e, 0x1f18e],
  [0x1f191, 0x1f19a],
  [0x1f1e6, 0x1f1ff],
  [0x1f200, 0x1f2ff],
  [0x1f300, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f900, 0x1f9ff],
  [0x1fa70, 0x1faff],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
]

function isWide(cp: number): boolean {
  return WIDE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)
}

function plainLength(text: string): number {
  let n = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    n += isWide(cp) ? 2 : 1
  }
  return n
}

/** X weighted length: URLs = 23, wide/emoji chars = 2, else 1. Limit: 280. */
export function weightedLength(text: string): number {
  let len = 0
  let last = 0
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0
    len += plainLength(text.slice(last, start))
    len += 23
    last = start + m[0].length
  }
  len += plainLength(text.slice(last))
  return len
}

export const X_WEIGHTED_LIMIT = 280

/**
 * Normalized form for no-repeat detection (stored in posts.content_text):
 * lowercase · thread numbering ("1/n") stripped · URLs → <url> · whitespace collapsed.
 */
export function normalizeContent(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' <url> ')
    .replace(/^\s*\d+\s*\/\s*\d+\s*/gmu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalize a whole thread into one content_text string. */
export function threadToContentText(tweets: string[]): string {
  return normalizeContent(tweets.join('\n'))
}

/** sha256 hex digest — stored in posts.content_hash for exact-dup lookups. */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 1/3-style numbering preview for a thread. */
export function numberedTweets(tweets: string[]): string {
  const n = tweets.length
  return tweets.map((t, i) => `${i + 1}/${n}\n${t}`).join('\n\n')
}
