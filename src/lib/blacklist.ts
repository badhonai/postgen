/**
 * Blacklist ("taboo") word/symbol matching — shared by the web editor
 * (warn-as-you-type) and the agent API (hard block on writes).
 *
 * Entries containing letters/digits match on word boundaries
 * ("gm" hits "gm!" but not "legma"); pure-symbol entries match
 * anywhere ("🚀", "🔥🔥"). Matching is case-insensitive.
 */
export function blacklistHits(text: string, entries: string[] | undefined | null): string[] {
  if (!text || !entries?.length) return []
  const hits: string[] = []
  for (const raw of entries) {
    const entry = raw.trim()
    if (!entry) continue
    const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = /[a-z0-9]/i.test(entry)
      ? new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i')
      : new RegExp(escaped, 'i')
    if (pattern.test(text)) hits.push(entry)
  }
  return hits
}

/** Both blacklist key spellings (tabooWords is the legacy name). */
export function projectBlacklist(brandVoice: { blacklist?: string[]; tabooWords?: string[] } | null | undefined): string[] {
  return brandVoice?.blacklist ?? brandVoice?.tabooWords ?? []
}
