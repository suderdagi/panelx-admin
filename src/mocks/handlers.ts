import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { ORDER_STATUSES, type Product } from '@/api/types'
import { hasPermission, type Permission } from '@/auth/permissions'
import { productSchema } from '@/lib/schemas'
import { db } from './db'
import { matches, paginate, readListParams, sortBy } from './query'
import { computeStats } from './stats'

/**
 * Mock REST API. It behaves like a real backend: it checks the token, enforces role
 * permissions, validates input and returns proper status codes. This lets the frontend
 * be developed and demoed without a server.
 */

const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 250
const DEMO_PASSWORD = 'demo1234'

const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

function currentUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  const id = Number(token?.replace('mock-token-', ''))
  return db.users.find((u) => u.id === id)
}

/** Returns an error response, or null when the request is allowed. */
function guard(request: Request, permission?: Permission) {
  const user = currentUser(request)
  if (!user) return error(401, 'Your session has expired. Please sign in again.')
  if (permission && !hasPermission(user.role, permission)) {
    return error(403, 'You do not have permission to do this.')
  }
  return null
}

export const handlers = [
  http.all('/api/*', async () => {
    await delay(LATENCY_MS)
  }),

  // Auth
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string }
    const user = db.users.find((u) => u.email === email.trim().toLowerCase())
    if (!user || password !== DEMO_PASSWORD) return error(401, 'Invalid email or password')
    return HttpResponse.json({ token: `mock-token-${user.id}`, user })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const user = currentUser(request)
    return user ? HttpResponse.json(user) : error(401, 'Not signed in')
  }),

  // Dashboard
  http.get('/api/stats', ({ request }) => {
    const denied = guard(request)
    if (denied) return denied
    const range = Number(new URL(request.url).searchParams.get('range')) || 30
    return HttpResponse.json(computeStats(db, Math.min(Math.max(range, 7), 90)))
  }),

  // Orders
  http.get('/api/orders', ({ request }) => {
    const denied = guard(request)
    if (denied) return denied

    const url = new URL(request.url)
    const { page, pageSize, search, sortField, sortDir } = readListParams(url)
    const status = url.searchParams.get('status')

    const filtered = db.orders.filter(
      (o) => (!status || o.status === status) && matches(search, o.number, o.customerName, o.city)
    )
    return HttpResponse.json(paginate(sortBy(filtered, sortField || 'createdAt', sortField ? sortDir : -1), page, pageSize))
  }),

  http.get('/api/orders/:id', ({ request, params }) => {
    const denied = guard(request)
    if (denied) return denied
    const order = db.orders.find((o) => o.id === Number(params.id))
    return order ? HttpResponse.json(order) : error(404, 'Order not found')
  }),

  http.patch('/api/orders/:id', async ({ request, params }) => {
    const denied = guard(request, 'orders:update')
    if (denied) return denied

    const parsed = z.object({ status: z.enum(ORDER_STATUSES) }).safeParse(await request.json())
    if (!parsed.success) return error(400, 'Invalid status')

    const order = db.orders.find((o) => o.id === Number(params.id))
    if (!order) return error(404, 'Order not found')
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return error(409, `A ${order.status} order cannot be changed`)
    }

    order.status = parsed.data.status
    return HttpResponse.json(order)
  }),

  // Products
  http.get('/api/products', ({ request }) => {
    const denied = guard(request)
    if (denied) return denied

    const url = new URL(request.url)
    const { page, pageSize, search, sortField, sortDir } = readListParams(url)
    const category = url.searchParams.get('category')
    const lowStock = url.searchParams.get('lowStock') === 'true'

    const filtered = db.products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!lowStock || p.stock < 10) &&
        matches(search, p.name, p.sku)
    )
    return HttpResponse.json(paginate(sortBy(filtered, sortField || 'name', sortField ? sortDir : 1), page, pageSize))
  }),

  http.post('/api/products', async ({ request }) => {
    const denied = guard(request, 'products:write')
    if (denied) return denied

    const parsed = productSchema.safeParse(await request.json())
    if (!parsed.success) return error(400, parsed.error.issues[0].message)
    if (db.products.some((p) => p.sku === parsed.data.sku)) return error(409, 'SKU already exists')

    const product: Product = {
      ...parsed.data,
      id: Math.max(0, ...db.products.map((p) => p.id)) + 1,
      createdAt: new Date().toISOString(),
    }
    db.products.push(product)
    return HttpResponse.json(product, { status: 201 })
  }),

  http.put('/api/products/:id', async ({ request, params }) => {
    const denied = guard(request, 'products:write')
    if (denied) return denied

    const product = db.products.find((p) => p.id === Number(params.id))
    if (!product) return error(404, 'Product not found')

    const parsed = productSchema.safeParse(await request.json())
    if (!parsed.success) return error(400, parsed.error.issues[0].message)
    if (db.products.some((p) => p.sku === parsed.data.sku && p.id !== product.id)) {
      return error(409, 'SKU already exists')
    }

    Object.assign(product, parsed.data)
    return HttpResponse.json(product)
  }),

  http.delete('/api/products/:id', ({ request, params }) => {
    const denied = guard(request, 'products:delete')
    if (denied) return denied

    const index = db.products.findIndex((p) => p.id === Number(params.id))
    if (index === -1) return error(404, 'Product not found')
    db.products.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Customers
  http.get('/api/customers', ({ request }) => {
    const denied = guard(request)
    if (denied) return denied

    const { page, pageSize, search, sortField, sortDir } = readListParams(new URL(request.url))
    const filtered = db.customers.filter((c) => matches(search, c.name, c.email, c.city))
    return HttpResponse.json(paginate(sortBy(filtered, sortField || 'totalSpent', sortField ? sortDir : -1), page, pageSize))
  }),

  // Team
  http.get('/api/users', ({ request }) => {
    const denied = guard(request, 'users:manage')
    if (denied) return denied
    return HttpResponse.json(db.users)
  }),

  http.patch('/api/users/:id', async ({ request, params }) => {
    const denied = guard(request, 'users:manage')
    if (denied) return denied

    const parsed = z.object({ role: z.enum(['admin', 'editor', 'viewer']) }).safeParse(await request.json())
    if (!parsed.success) return error(400, 'Invalid role')

    const user = db.users.find((u) => u.id === Number(params.id))
    if (!user) return error(404, 'User not found')
    if (user.id === currentUser(request)?.id) return error(409, 'You cannot change your own role')

    // There must always be at least one admin
    const admins = db.users.filter((u) => u.role === 'admin')
    if (user.role === 'admin' && parsed.data.role !== 'admin' && admins.length === 1) {
      return error(409, 'At least one admin is required')
    }

    user.role = parsed.data.role
    return HttpResponse.json(user)
  }),
]
