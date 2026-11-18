import { hasPermission } from '@/auth/permissions'
import { toCsv } from './csv'
import { productSchema } from './schemas'
import { computeStats } from '@/mocks/stats'
import { createDb } from '@/mocks/db'
import { formatDayLabel } from './format'

/** Runs `fn` as if the computer were in another time zone (Node re-reads TZ when it is assigned). */
function inTimeZone<T>(timeZone: string, fn: () => T): T {
  const previous = process.env.TZ
  process.env.TZ = timeZone
  try {
    return fn()
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
}

describe('permissions', () => {
  it('gives admins everything and viewers nothing', () => {
    expect(hasPermission('admin', 'users:manage')).toBe(true)
    expect(hasPermission('editor', 'products:write')).toBe(true)
    expect(hasPermission('editor', 'products:delete')).toBe(false)
    expect(hasPermission('viewer', 'orders:update')).toBe(false)
    expect(hasPermission(undefined, 'data:export')).toBe(false)
  })
})

describe('toCsv', () => {
  it('quotes special characters and blocks spreadsheet formulas', () => {
    const csv = toCsv([{ name: 'Kaya, "Ahmet"', note: '=HYPERLINK("x")', total: -5 }], [
      { header: 'Name', value: (r) => r.name },
      { header: 'Note', value: (r) => r.note },
      { header: 'Total', value: (r) => r.total },
    ])
    expect(csv).toBe('Name,Note,Total\n"Kaya, ""Ahmet""","\'=HYPERLINK(""x"")",-5')
  })
})

describe('productSchema', () => {
  it('normalizes the SKU and rejects bad values', () => {
    const valid = productSchema.parse({ name: 'Mug', sku: 'hom-1234', category: 'Home', price: 99.9, stock: 3, status: 'active' })
    expect(valid.sku).toBe('HOM-1234')

    const invalid = productSchema.safeParse({ name: 'M', sku: '123', category: 'Home', price: -1, stock: 1.5, status: 'active' })
    expect(invalid.success).toBe(false)
    expect(invalid.error?.issues.map((i) => i.path[0])).toEqual(['name', 'sku', 'price', 'stock'])
  })
})

describe('computeStats', () => {
  it('excludes cancelled orders from revenue and fills every day of the range', () => {
    const now = Date.parse('2026-06-15T12:00:00Z')
    const db = createDb(now)
    const stats = computeStats(db, 30, now)

    expect(stats.revenueByDay).toHaveLength(30)
    const dailySum = stats.revenueByDay.reduce((sum, d) => sum + d.revenue, 0)
    expect(dailySum).toBeCloseTo(stats.revenue.value, 0)
    expect(stats.ordersByStatus.find((s) => s.status === 'cancelled')?.count ?? 0).toBeGreaterThanOrEqual(0)
  })
})

describe('dashboard day labels', () => {
  it('label every day with its local calendar date, ending with today', () => {
    // 13:00 in Istanbul (UTC+3) on 18 November
    const now = Date.parse('2026-11-18T10:00:00Z')
    const days = inTimeZone('Europe/Istanbul', () => computeStats(createDb(now), 7, now).revenueByDay.map((d) => d.date))

    expect(days).toEqual(['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'])
  })

  it('shows a calendar date the same way in every time zone', () => {
    for (const zone of ['Europe/Istanbul', 'America/Los_Angeles', 'Pacific/Auckland']) {
      expect(inTimeZone(zone, () => formatDayLabel('2026-11-18'))).toBe('18 Nov')
    }
  })
})
