import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/endpoints'
import { ApiError } from '@/api/client'
import type { Role, User } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/auth/permissions'
import { PageHeader } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { timeAgo } from '@/lib/format'

const ROLES: Role[] = ['admin', 'editor', 'viewer']

export function TeamPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const users = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => usersApi.updateRole(id, role),
    // Optimistic update: the select changes instantly and rolls back if the API refuses
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] })
      const previous = queryClient.getQueryData<User[]>(['users'])
      queryClient.setQueryData<User[]>(['users'], (list) => list?.map((u) => (u.id === id ? { ...u, role } : u)))
      return { previous }
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(['users'], context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div>
      <PageHeader title="Team" description="Control who can see and change what" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <Card key={role} className="p-4">
            <p className="text-sm font-semibold">{ROLE_LABELS[role]}</p>
            <p className="mt-1 text-sm text-slate-500">{ROLE_DESCRIPTIONS[role]}</p>
          </Card>
        ))}
      </div>

      {changeRole.isError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {changeRole.error instanceof ApiError ? changeRole.error.message : 'Could not change the role'}
        </p>
      )}

      <Card>
        {users.isLoading && <Spinner />}
        {users.isError && <ErrorState message="Could not load team members." onRetry={() => users.refetch()} />}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.data?.map((user) => (
            <li key={user.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {user.name} {user.id === me?.id && <span className="text-slate-400">(you)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {user.email} · active {timeAgo(user.lastActiveAt)}
                </p>
              </div>
              <Select
                aria-label={`Role of ${user.name}`}
                value={user.role}
                disabled={user.id === me?.id}
                onChange={(e) => changeRole.mutate({ id: user.id, role: e.target.value as Role })}
                className="sm:w-40"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
