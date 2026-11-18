import type { Role } from '@/api/types'
import { db } from './db'

/** The mock API is called directly here (no UI), the way any other client would call a real backend. */

const ACCOUNTS: Record<Role, string> = { admin: 'admin@panelx.dev', editor: 'editor@panelx.dev', viewer: 'viewer@panelx.dev' }
const ROLES: Role[] = ['viewer', 'editor', 'admin']

async function call(method: string, path: string, as?: Role, body?: unknown) {
  const user = as && db.users.find((u) => u.email === ACCOUNTS[as])
  const response = await fetch(path, {
    method,
    headers: {
      ...(user ? { Authorization: `Bearer mock-token-${user.id}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await response.json().catch(() => null)) as { message?: string } | null
  return { status: response.status, message: json?.message }
}

const newProduct = { name: 'Test lamp', sku: 'LMP-0001', category: 'Home', price: 120, stock: 5, status: 'active' }

describe('mock API', () => {
  it('asks for a sign-in before anything else (401)', async () => {
    for (const [method, path] of [['GET', '/api/orders'], ['GET', '/api/stats'], ['POST', '/api/products'], ['GET', '/api/users']]) {
      expect((await call(method, path)).status, `${method} ${path}`).toBe(401)
    }
  })

  it('enforces the role table (403), whatever the interface shows', async () => {
    const order = db.orders.find((o) => o.status === 'pending')!
    // [method, path, body, roles that are allowed]; denied roles are tried first because they must not change anything
    const rules: [string, string, unknown, Role[]][] = [
      ['PATCH', `/api/orders/${order.id}`, { status: 'processing' }, ['admin', 'editor']],
      ['POST', '/api/products', newProduct, ['admin', 'editor']],
      ['DELETE', `/api/products/${db.products[0].id}`, undefined, ['admin']],
      ['GET', '/api/users', undefined, ['admin']],
    ]
    for (const [method, path, body, allowed] of rules) {
      for (const role of ROLES) {
        const { status } = await call(method, path, role, body)
        const what = `${role} ${method} ${path}`
        if (allowed.includes(role)) expect(status, what).not.toBe(403)
        else expect(status, what).toBe(403)
      }
    }
  })

  it('rejects bad input (400), unknown ids (404) and conflicts (409)', async () => {
    const pending = db.orders.find((o) => o.status === 'pending')!
    const delivered = db.orders.find((o) => o.status === 'delivered')!

    expect((await call('POST', '/api/products', 'editor', { ...newProduct, sku: 'nope' })).status).toBe(400)
    expect((await call('POST', '/api/products', 'editor', { ...newProduct, sku: db.products[0].sku })).status).toBe(409)
    expect((await call('PATCH', `/api/orders/${pending.id}`, 'editor', { status: 'teleported' })).status).toBe(400)
    expect((await call('PATCH', '/api/orders/999999', 'editor', { status: 'shipped' })).status).toBe(404)
    expect(await call('PATCH', `/api/orders/${delivered.id}`, 'editor', { status: 'pending' })).toMatchObject({
      status: 409,
      message: 'A delivered order cannot be changed',
    })
  })

  it('lets an admin change another person’s role but not their own', async () => {
    const admin = db.users.find((u) => u.email === ACCOUNTS.admin)!
    const viewer = db.users.find((u) => u.email === ACCOUNTS.viewer)!

    expect(await call('PATCH', `/api/users/${admin.id}`, 'admin', { role: 'viewer' })).toMatchObject({
      status: 409,
      message: 'You cannot change your own role',
    })
    expect((await call('PATCH', `/api/users/${viewer.id}`, 'admin', { role: 'editor' })).status).toBe(200)
    expect(viewer.role).toBe('editor')
  })
})
