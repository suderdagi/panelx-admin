export type Role = 'admin' | 'editor' | 'viewer'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  lastActiveAt: string
}

export type ProductStatus = 'active' | 'draft'

export const CATEGORIES = ['Electronics', 'Home', 'Clothing', 'Books', 'Sports', 'Beauty'] as const
export type Category = (typeof CATEGORIES)[number]

export interface Product {
  id: number
  name: string
  sku: string
  category: Category
  price: number
  stock: number
  status: ProductStatus
  createdAt: string
}

export interface Customer {
  id: number
  name: string
  email: string
  city: string
  ordersCount: number
  totalSpent: number
  createdAt: string
}

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface OrderItem {
  productId: number
  name: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: number
  number: string
  customerId: number
  customerName: string
  city: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  paymentMethod: 'card' | 'transfer' | 'cash_on_delivery'
  createdAt: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ListParams {
  page: number
  pageSize: number
  search?: string
  sort?: string // "field:asc" | "field:desc"
}

export interface Kpi {
  value: number
  /** Percentage change compared to the previous period of the same length */
  change: number | null
}

export interface DashboardStats {
  range: number
  revenue: Kpi
  orders: Kpi
  averageOrderValue: Kpi
  newCustomers: Kpi
  revenueByDay: { date: string; revenue: number; orders: number }[]
  salesByCategory: { category: Category; revenue: number }[]
  ordersByStatus: { status: OrderStatus; count: number }[]
  topProducts: { productId: number; name: string; quantity: number; revenue: number }[]
}
