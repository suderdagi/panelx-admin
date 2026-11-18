import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/endpoints'
import { setUnauthorizedHandler, tokenStorage } from '@/api/client'
import type { User } from '@/api/types'
import { identify, resetIdentity, track } from '@/analytics/analytics'
import { hasPermission, type Permission } from './permissions'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => tokenStorage.get() !== null)

  const logout = useCallback(() => {
    if (tokenStorage.get()) track('logged_out')
    resetIdentity()
    tokenStorage.clear()
    setUser(null)
    queryClient.clear() // don't show the previous user's data to the next one
  }, [queryClient])

  // Restore the session from a saved token
  useEffect(() => {
    if (!tokenStorage.get()) return
    authApi
      .me()
      .then((user) => {
        identify(user)
        setUser(user)
      })
      .catch(logout)
      .finally(() => setIsLoading(false))
  }, [logout])

  useEffect(() => setUnauthorizedHandler(logout), [logout])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password)
    tokenStorage.set(token)
    identify(user)
    track('logged_in', { role: user.role })
    setUser(user)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, can: (permission) => hasPermission(user?.role, permission) }),
    [user, isLoading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
