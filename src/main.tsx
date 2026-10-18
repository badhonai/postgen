import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { initAccent, initTheme } from './lib/theme'
import App from './App.tsx'
import './index.css'

initAccent()
initTheme()

// Cache server state for a while: pages should render instantly from
// cache on revisit instead of refetching projects/posts/assets every
// navigation (the old default staleTime of 0 made every screen hit the
// network). Mutations invalidate explicitly where freshness matters.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)

// Register the PWA service worker (production only) so Chrome can offer
// "Install app" and the installed app shell loads fast from home screen.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* installability is a bonus, never a blocker */
    })
  })
}
