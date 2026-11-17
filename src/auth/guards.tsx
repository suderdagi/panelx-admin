import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from './AuthContext'
import type { Permission } from './permissions'

export function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="grid h-screen place-items-center">
        <Spinner />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Renders children only when the current user has the permission. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAuth()
  return <>{can(permission) ? children : fallback}</>
}

export function RequirePermission({ permission }: { permission: Permission }) {
  const { can } = useAuth()
  return can(permission) ? <Outlet /> : <Navigate to="/" replace />
}
