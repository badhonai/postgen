import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/env'
import { ConfigNotice, Spinner } from '../../components/ui'
import { useAuth } from './context'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) return <ConfigNotice />
  if (loading) return <Spinner />
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
