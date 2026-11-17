import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/auth/permissions'
import type { Role } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

const DEMO_ACCOUNTS: { role: Role; email: string }[] = [
  { role: 'admin', email: 'admin@panelx.dev' },
  { role: 'editor', email: 'editor@panelx.dev' },
  { role: 'viewer', email: 'viewer@panelx.dev' },
]
const DEMO_PASSWORD = 'demo1234'

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Once signed in, go back to the page the user originally asked for
  if (user) return <Navigate to={redirectTo} replace />

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    }
  })

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="mx-auto h-12 w-12" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Sign in to PanelX</h1>
          <p className="mt-1 text-sm text-slate-500">Store admin dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" error={errors.email?.message}>
            {(props) => <Input type="email" autoComplete="email" {...props} {...register('email')} />}
          </Field>
          <Field label="Password" error={errors.password?.message}>
            {(props) => <Input type="password" autoComplete="current-password" {...props} {...register('password')} />}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Demo accounts · password {DEMO_PASSWORD}</p>
          <div className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map(({ role, email }) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setValue('email', email)
                  setValue('password', DEMO_PASSWORD)
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                <span className="block text-xs text-slate-500">{ROLE_DESCRIPTIONS[role]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
