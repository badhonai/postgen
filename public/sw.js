/* PostGen service worker — deliberately conservative.
 *
 * Its jobs: make Chrome happy about installability, and keep the app
 * shell reachable on a flaky connection. Everything is network-first so
 * a fresh deploy always wins; the cache is only a fallback for page
 * navigations and a fast path for the (immutable, hashed-by-us) icons.
 */
const CACHE = 'postgen-shell-v3'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined) // a missing shell file must never block install
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Icons/manifest: cache-first (they change only with a CACHE bump).
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest' || url.pathname === '/favicon.svg') {
    event.respondWith(
      caches.match(request).then((hit) => hit ?? fetch(request)),
    )
    return
  }

  // Navigations: network-first, fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          void caches.open(CACHE).then((cache) => cache.put('/', copy))
          return res
        })
        .catch(() => caches.match('/').then((hit) => hit ?? Response.error())),
    )
  }
  // Everything else (JS/CSS chunks, API): straight to network so deploys
  // and data are never stale.
})
