import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './features/auth/RequireAuth'
import { useAuth } from './features/auth/context'
import { isSupabaseConfigured } from './lib/env'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import { Spinner } from './components/ui'

// Authed pages are split into their own chunks: the landing/login load
// stays tiny and each heavy screen (editor, settings, shares…) downloads
// only when first visited, then stays cached.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const PostEditorPage = lazy(() => import('./pages/PostEditorPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const PromptLibraryPage = lazy(() => import('./pages/PromptLibraryPage'))
const ArtworksPage = lazy(() => import('./pages/ArtworksPage'))
const SharesPage = lazy(() => import('./pages/SharesPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const CommandPalette = lazy(() => import('./components/CommandPalette'))

/** Root: logged-in users open straight on the Dashboard (this is also the
 * installed app's start_url); logged-out visitors see the landing page. */
function RootRoute() {
  const { session, loading } = useAuth()
  if (isSupabaseConfigured && loading) return <PageFallback />
  if (session) return <Navigate to="/dashboard" replace />
  return <HomePage />
}

/** Login is pointless with a live session: go straight to the Dashboard. */
function LoginRoute() {
  const { session, loading } = useAuth()
  if (isSupabaseConfigured && loading) return <PageFallback />
  if (session) return <Navigate to="/dashboard" replace />
  return <LoginPage />
}

function PageFallback() {
  return (
    <div className="pg-shell flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <RequireAuth>
                <ProjectDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:id/posts/new"
            element={
              <RequireAuth>
                <PostEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/posts/:id"
            element={
              <RequireAuth>
                <PostEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/prompts"
            element={
              <RequireAuth>
                <PromptLibraryPage />
              </RequireAuth>
            }
          />
          <Route
            path="/Artworks"
            element={
              <RequireAuth>
                <ArtworksPage />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <HistoryPage />
              </RequireAuth>
            }
          />
          <Route
            path="/shares"
            element={
              <RequireAuth>
                <SharesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
