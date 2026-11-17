import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '@/App'
import { AuthProvider } from '@/auth/AuthContext'
import { tokenStorage } from '@/api/client'
import type { Role } from '@/api/types'

const USER_IDS: Record<Role, number> = { admin: 1, editor: 2, viewer: 3 }

/** Renders the whole app at `path`, optionally already signed in with a demo role. */
export function renderApp(path = '/', role?: Role) {
  if (role) tokenStorage.set(`mock-token-${USER_IDS[role]}`)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
