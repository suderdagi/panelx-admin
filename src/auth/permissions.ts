import type { Role } from '@/api/types'

export type Permission =
  | 'orders:update'
  | 'products:write'
  | 'products:delete'
  | 'users:manage'
  | 'data:export'

/**
 * Role based access control. The same table is used by the UI (to hide or disable actions)
 * and by the mock API (to reject requests), like a real backend would.
 */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ['orders:update', 'products:write', 'products:delete', 'users:manage', 'data:export'],
  editor: ['orders:update', 'products:write', 'data:export'],
  viewer: [],
}

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Full access, including user management',
  editor: 'Can manage products and update orders',
  viewer: 'Read-only access to all pages',
}
