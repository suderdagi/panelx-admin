import type { ProductInput } from '@/lib/schemas'
import { api } from './client'
import type {
  Customer,
  DashboardStats,
  ListParams,
  Order,
  OrderStatus,
  Paginated,
  Product,
  Role,
  User,
} from './types'

export const authApi = {
  login: (email: string, password: string) => api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  me: () => api.get<User>('/auth/me'),
}

export const statsApi = {
  get: (range: number) => api.get<DashboardStats>('/stats', { range }),
}

export const ordersApi = {
  list: (params: ListParams & { status?: OrderStatus }) => api.get<Paginated<Order>>('/orders', { ...params }),
  get: (id: number) => api.get<Order>(`/orders/${id}`),
  updateStatus: (id: number, status: OrderStatus) => api.patch<Order>(`/orders/${id}`, { status }),
}

export const productsApi = {
  list: (params: ListParams & { category?: string; lowStock?: boolean }) =>
    api.get<Paginated<Product>>('/products', { ...params }),
  create: (input: ProductInput) => api.post<Product>('/products', input),
  update: (id: number, input: ProductInput) => api.put<Product>(`/products/${id}`, input),
  remove: (id: number) => api.delete(`/products/${id}`),
}

export const customersApi = {
  list: (params: ListParams) => api.get<Paginated<Customer>>('/customers', { ...params }),
}

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  updateRole: (id: number, role: Role) => api.patch<User>(`/users/${id}`, { role }),
}
