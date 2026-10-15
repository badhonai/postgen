/**
 * Recent share recipients — saved locally after each successful send so
 * the send form can offer one-tap quick-select chips next time instead
 * of re-typing the email. Local to this device/browser, most recent
 * first, capped.
 */

const KEY = 'postgen.recipient-emails'
const MAX = 8

export function getRecentRecipients(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as unknown
    if (!Array.isArray(list)) return []
    return list.filter((e): e is string => typeof e === 'string' && e.includes('@')).slice(0, MAX)
  } catch {
    return []
  }
}

export function rememberRecipient(email: string): string[] {
  const clean = email.trim()
  if (!clean || !clean.includes('@')) return getRecentRecipients()
  const list = [clean, ...getRecentRecipients().filter((e) => e.toLowerCase() !== clean.toLowerCase())].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* private mode — chips just won't persist */
  }
  return list
}

export function forgetRecipient(email: string): string[] {
  const list = getRecentRecipients().filter((e) => e.toLowerCase() !== email.toLowerCase())
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
  return list
}
