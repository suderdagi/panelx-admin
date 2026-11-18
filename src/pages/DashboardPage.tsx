import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { track } from '@/analytics/analytics'
import { ordersApi, statsApi } from '@/api/endpoints'
import type { Kpi } from '@/api/types'
import { PageHeader } from '@/components/layout/AppLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { formatChange, formatCurrency, formatDayLabel, formatNumber, timeAgo, statusLabel } from '@/lib/format'

const RANGES = [7, 30, 90] as const

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-400',
  processing: 'bg-indigo-500',
  shipped: 'bg-sky-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-400',
}

function KpiCard({ label, kpi, format }: { label: string; kpi: Kpi; format: (n: number) => string }) {
  const positive = (kpi.change ?? 0) >= 0
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{format(kpi.value)}</p>
      <p className={clsx('mt-1 inline-flex items-center gap-1 text-xs font-medium', positive ? 'text-emerald-600' : 'text-red-600')}>
        {kpi.change !== null && (positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
        {formatChange(kpi.change)}
        <span className="font-normal text-slate-400">vs previous period</span>
      </p>
    </Card>
  )
}

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const range = RANGES.find((r) => r === Number(params.get('range'))) ?? 30

  const stats = useQuery({ queryKey: ['stats', range], queryFn: () => statsApi.get(range) })
  const recent = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => ordersApi.list({ page: 1, pageSize: 6, sort: 'createdAt:desc' }),
  })

  const rangePicker = (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Date range">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => {
            if (r !== range) track('dashboard_range_changed', { days: r })
            setParams({ range: String(r) }, { replace: true })
          }}
          aria-pressed={r === range}
          className={clsx(
            'rounded-md px-3 py-1.5 text-sm font-medium',
            r === range ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          {r} days
        </button>
      ))}
    </div>
  )

  if (stats.isError) {
    return <ErrorState message="Could not load dashboard data." onRetry={() => stats.refetch()} />
  }

  const data = stats.data
  const totalStatus = data?.ordersByStatus.reduce((sum, s) => sum + s.count, 0) ?? 0

  return (
    <div>
      <PageHeader title="Dashboard" description={`Store performance over the last ${range} days`} actions={rangePicker} />

      {!data ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Revenue" kpi={data.revenue} format={(n) => formatCurrency(n)} />
            <KpiCard label="Orders" kpi={data.orders} format={formatNumber} />
            <KpiCard label="Average order value" kpi={data.averageOrderValue} format={(n) => formatCurrency(n)} />
            <KpiCard label="New customers" kpi={data.newCustomers} format={formatNumber} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Revenue" description="Daily revenue, cancelled orders excluded" />
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueByDay} margin={{ left: 8, right: 8 }}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDayLabel} tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickFormatter={(v) => `₺${Math.round(v / 1000)}k`} tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={(label: string) => formatDayLabel(label)}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Orders by status" description={`${formatNumber(totalStatus)} orders`} />
              <div className="space-y-4 p-5">
                {[...data.ordersByStatus]
                  .sort((a, b) => b.count - a.count)
                  .map(({ status, count }) => (
                    <div key={status}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{statusLabel(status)}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={clsx('h-full rounded-full', STATUS_COLORS[status])} style={{ width: `${(count / totalStatus) * 100}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader title="Sales by category" />
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.salesByCategory} layout="vertical" margin={{ left: 16 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fillOpacity: 0.05 }} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Top products" />
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.topProducts.map((p, index) => (
                  <li key={p.productId} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-5 text-slate-400">{index + 1}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-slate-500">{p.quantity} sold</span>
                    <span className="w-24 text-right font-medium">{formatCurrency(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Recent orders" action={<Link to="/orders" className="text-xs font-medium text-indigo-600 hover:underline">View all</Link>} />
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.data?.data.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{order.customerName}</p>
                      <p className="text-xs text-slate-500">
                        {order.number} · {timeAgo(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.total)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
