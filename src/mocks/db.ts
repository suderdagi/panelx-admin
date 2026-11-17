import { faker } from '@faker-js/faker'
import {
  CATEGORIES,
  ORDER_STATUSES,
  type Customer,
  type Order,
  type OrderStatus,
  type Product,
  type User,
} from '@/api/types'

/**
 * In-memory "database" for the mock API.
 * A fixed seed makes the data the same on every load, while dates are relative to today
 * so the dashboard always shows recent activity.
 */

const DAY = 24 * 60 * 60 * 1000
// Common Turkish names; faker's Turkish locale has many very rare ones
const FIRST_NAMES = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Emre', 'Burak', 'Can', 'Murat', 'Kerem', 'Onur', 'Ayşe', 'Fatma', 'Elif', 'Zeynep', 'Merve', 'Esra', 'Selin', 'Büşra', 'Deniz', 'Ece', 'Gizem', 'Hakan', 'İrem', 'Yusuf', 'Ömer']
const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Polat']

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Elazığ', 'Konya', 'Trabzon']

const PRODUCT_NAMES: Record<(typeof CATEGORIES)[number], string[]> = {
  Electronics: ['Wireless Earbuds', 'Bluetooth Speaker', 'Smart Watch', 'USB-C Charger', 'Mechanical Keyboard', 'Webcam HD'],
  Home: ['Ceramic Mug Set', 'Desk Lamp', 'Cotton Towel', 'Coffee Grinder', 'Scented Candle', 'Wall Clock'],
  Clothing: ['Linen Shirt', 'Denim Jacket', 'Wool Scarf', 'Running Socks', 'Rain Coat', 'Basic T-Shirt'],
  Books: ['Clean Code', 'Design Patterns', 'The Pragmatic Programmer', 'Refactoring', 'Atomic Habits', 'Deep Work'],
  Sports: ['Yoga Mat', 'Water Bottle', 'Resistance Bands', 'Jump Rope', 'Foam Roller', 'Gym Bag'],
  Beauty: ['Face Serum', 'Hand Cream', 'Lip Balm', 'Shampoo Bar', 'Sunscreen SPF50', 'Body Lotion'],
}

const toAscii = (text: string) =>
  text
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')

function weightedStatus(createdAt: number, now: number): OrderStatus {
  const ageDays = (now - createdAt) / DAY
  if (faker.number.float() < 0.06) return 'cancelled'
  if (ageDays < 1) return faker.helpers.arrayElement(['pending', 'processing'])
  if (ageDays < 4) return faker.helpers.arrayElement(['processing', 'shipped'])
  if (ageDays < 8) return faker.helpers.arrayElement(['shipped', 'delivered'])
  return 'delivered'
}

export interface Db {
  users: User[]
  products: Product[]
  customers: Customer[]
  orders: Order[]
}

export function createDb(now = Date.now()): Db {
  faker.seed(2026)

  const users: User[] = [
    { id: 1, name: 'Sude Erdağı', email: 'admin@panelx.dev', role: 'admin', lastActiveAt: new Date(now).toISOString() },
    { id: 2, name: 'Emre Kaya', email: 'editor@panelx.dev', role: 'editor', lastActiveAt: new Date(now - DAY).toISOString() },
    { id: 3, name: 'Zeynep Arslan', email: 'viewer@panelx.dev', role: 'viewer', lastActiveAt: new Date(now - 3 * DAY).toISOString() },
    ...Array.from({ length: 5 }, (_, i) => ({
      id: i + 4,
      name: `${faker.helpers.arrayElement(FIRST_NAMES)} ${faker.helpers.arrayElement(LAST_NAMES)}`,
      email: `team${i + 4}@panelx.dev`,
      role: faker.helpers.arrayElement(['editor', 'viewer'] as const),
      lastActiveAt: faker.date.recent({ days: 30, refDate: now }).toISOString(),
    })),
  ]

  let productId = 0
  const products: Product[] = CATEGORIES.flatMap((category) =>
    PRODUCT_NAMES[category].map((name) => {
      productId += 1
      return {
        id: productId,
        name,
        sku: `${category.slice(0, 3).toUpperCase()}-${String(1000 + productId)}`,
        category,
        price: faker.number.int({ min: 8, max: category === 'Electronics' ? 120 : 40 }) * 25 - 0.01,
        stock: faker.helpers.weightedArrayElement([
          { weight: 1, value: 0 },
          { weight: 2, value: faker.number.int({ min: 1, max: 9 }) },
          { weight: 7, value: faker.number.int({ min: 10, max: 300 }) },
        ]),
        status: faker.helpers.weightedArrayElement([
          { weight: 9, value: 'active' as const },
          { weight: 1, value: 'draft' as const },
        ]),
        createdAt: faker.date.past({ years: 1, refDate: now }).toISOString(),
      }
    })
  )

  const customers: Customer[] = Array.from({ length: 140 }, (_, i) => {
    const firstName = faker.helpers.arrayElement(FIRST_NAMES)
    const lastName = faker.helpers.arrayElement(LAST_NAMES)
    return {
      id: i + 1,
      name: `${firstName} ${lastName}`,
      email: `${toAscii(firstName)}.${toAscii(lastName)}${i + 1}@example.com`,
      city: faker.helpers.arrayElement(CITIES),
      ordersCount: 0,
      totalSpent: 0,
      createdAt: new Date(now - faker.number.int({ min: 0, max: 180 }) * DAY).toISOString(),
    }
  })

  const activeProducts = products.filter((p) => p.status === 'active')
  const orders: Order[] = Array.from({ length: 900 }, (_, i) => {
    const customer = faker.helpers.arrayElement(customers)
    // More orders in recent weeks, so the revenue chart shows growth
    const ageDays = Math.floor(120 * Math.pow(faker.number.float(), 1.4))
    const createdAt = now - ageDays * DAY - faker.number.int({ min: 0, max: DAY - 1 })
    const items = faker.helpers.arrayElements(activeProducts, { min: 1, max: 3 }).map((p) => ({
      productId: p.id,
      name: p.name,
      quantity: faker.number.int({ min: 1, max: 3 }),
      unitPrice: p.price,
    }))
    const total = Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100) / 100
    const status = weightedStatus(createdAt, now)

    if (status !== 'cancelled') {
      customer.ordersCount += 1
      customer.totalSpent = Math.round((customer.totalSpent + total) * 100) / 100
    }

    return {
      id: i + 1,
      number: `#${10000 + i + 1}`,
      customerId: customer.id,
      customerName: customer.name,
      city: customer.city,
      items,
      total,
      status,
      paymentMethod: faker.helpers.arrayElement(['card', 'card', 'transfer', 'cash_on_delivery'] as const),
      createdAt: new Date(createdAt).toISOString(),
    }
  })

  return { users, products, customers, orders }
}

export let db = createDb()

/** Used by tests to start every test with fresh data. */
export function resetDb(now?: number) {
  db = createDb(now)
}

export { ORDER_STATUSES }
