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

/** Keep the mobile browser chrome tint matched to the shell. */
function syncThemeColor(): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  const dark = document.documentElement.dataset.theme === 'dark'
  const top = getComputedStyle(document.documentElement).getPropertyValue('--shell-1').trim()
  meta.content = dark ? '#17142f' : top || '#cfe0f7'
}

export function applyAccent(id: AccentId): void {
  document.documentElement.dataset.accent = id
  localStorage.setItem(STORAGE_KEY, id)
}

/** Called once at boot so the saved accent applies before first paint. */
export function initAccent(): void {
  applyAccent(getAccent())
}

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'postgen.theme'

export function getTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode
  syncThemeColor()
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* private mode — theme just won't persist */
  }
}

/** Called once at boot so the saved theme applies before first paint. */
export function initTheme(): void {
  applyTheme(getTheme())
}
