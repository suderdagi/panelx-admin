import { clsx } from 'clsx'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Moon, Package, ShoppingCart, Sun, Users, UserCog, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { ROLE_LABELS, type Permission } from '@/auth/permissions'
import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/Badge'

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; permission?: Permission }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/team', label: 'Team', icon: UserCog, permission: 'users:manage' },
]

export function AppLayout() {
  const { user, logout, can } = useAuth()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Main">
      {NAV.filter((item) => !item.permission || can(item.permission)).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  const logo = (
    <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
      <span className="text-lg font-bold tracking-tight">PanelX</span>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        {logo}
        {nav}
      </aside>

      {/* Mobile sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-slate-900">
            <button className="absolute right-3 top-5 p-1" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
            {logo}
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <button className="p-1 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium leading-tight">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <Badge tone="indigo">{ROLE_LABELS[user.role]}</Badge>
              </div>
            )}
            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
