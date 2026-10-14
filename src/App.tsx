import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './features/auth/RequireAuth'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import PostEditorPage from './pages/PostEditorPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import PromptLibraryPage from './pages/PromptLibraryPage'
import CommandPalette from './components/CommandPalette'

export default function App() {
  return (
    <>
      <CommandPalette />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
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
    </>
  )
}
