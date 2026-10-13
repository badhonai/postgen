export const ACCENTS = [
  { id: 'emerald', label: 'Emerald' },
  { id: 'violet', label: 'Violet' },
  { id: 'amber', label: 'Amber' },
  { id: 'rose', label: 'Rose' },
] as const

export type AccentId = (typeof ACCENTS)[number]['id']

const STORAGE_KEY = 'postgen.accent'

export function getAccent(): AccentId {
  const saved = localStorage.getItem(STORAGE_KEY)
  return (ACCENTS.some((a) => a.id === saved) ? saved : 'emerald') as AccentId
}

export function applyAccent(id: AccentId): void {
  document.documentElement.dataset.accent = id
  localStorage.setItem(STORAGE_KEY, id)
}

/** Called once at boot so the saved accent applies before first paint. */
export function initAccent(): void {
  applyAccent(getAccent())
}
