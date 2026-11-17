import type { DashboardStats, Kpi, Order } from '@/api/types'
import type { Db } from './db'

const DAY = 24 * 60 * 60 * 1000

const round = (n: number) => Math.round(n * 100) / 100

function kpi(current: number, previous: number): Kpi {
  return {
    value: round(current),
    change: previous === 0 ? null : round(((current - previous) / previous) * 100),
  }
}

function startOfDay(time: number) {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Aggregates the numbers shown on the dashboard for the last `range` days. */
export function computeStats(db: Db, range: number, now = Date.now()): DashboardStats {
  const from = startOfDay(now) - (range - 1) * DAY
  const previousFrom = from - range * DAY

  const counted = (o: Order) => o.status !== 'cancelled'
  const inRange = (o: Order, start: number, end: number) => {
    const t = Date.parse(o.createdAt)
    return t >= start && t < end
  }

  const current = db.orders.filter((o) => counted(o) && inRange(o, from, now + 1))
  const previous = db.orders.filter((o) => counted(o) && inRange(o, previousFrom, from))
  const sum = (orders: Order[]) => orders.reduce((total, o) => total + o.total, 0)

  const newCustomers = (start: number, end: number) =>
    db.customers.filter((c) => {
      const t = Date.parse(c.createdAt)
      return t >= start && t < end
    }).length

  const revenueByDay = Array.from({ length: range }, (_, i) => {
    const dayStart = from + i * DAY
    const dayOrders = current.filter((o) => inRange(o, dayStart, dayStart + DAY))
    return {
      date: new Date(dayStart).toISOString().slice(0, 10),
      revenue: round(sum(dayOrders)),
      orders: dayOrders.length,
    }
  })

  const categoryOf = new Map(db.products.map((p) => [p.id, p.category]))
  const byCategory = new Map<string, number>()
  const byProduct = new Map<number, { productId: number; name: string; quantity: number; revenue: number }>()

  for (const order of current) {
    for (const item of order.items) {
      const category = categoryOf.get(item.productId) ?? 'Home'
      byCategory.set(category, (byCategory.get(category) ?? 0) + item.quantity * item.unitPrice)

      const entry = byProduct.get(item.productId) ?? { productId: item.productId, name: item.name, quantity: 0, revenue: 0 }
      entry.quantity += item.quantity
      entry.revenue += item.quantity * item.unitPrice
      byProduct.set(item.productId, entry)
    }
  }

  const allInRange = db.orders.filter((o) => inRange(o, from, now + 1))
  const statusCounts = new Map<string, number>()
  for (const order of allInRange) statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1)

  return {
    range,
    revenue: kpi(sum(current), sum(previous)),
    orders: kpi(current.length, previous.length),
    averageOrderValue: kpi(
      current.length ? sum(current) / current.length : 0,
      previous.length ? sum(previous) / previous.length : 0
    ),
    newCustomers: kpi(newCustomers(from, now + 1), newCustomers(previousFrom, from)),
    revenueByDay,
    salesByCategory: [...byCategory]
      .map(([category, revenue]) => ({ category: category as DashboardStats['salesByCategory'][number]['category'], revenue: round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
    ordersByStatus: [...statusCounts].map(([status, count]) => ({
      status: status as DashboardStats['ordersByStatus'][number]['status'],
      count,
    })),
    topProducts: [...byProduct.values()]
      .map((p) => ({ ...p, revenue: round(p.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
  }
}
