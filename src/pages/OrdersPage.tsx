import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { Download, ShoppingCart } from 'lucide-react'
import { track } from '@/analytics/analytics'
import { ordersApi } from '@/api/endpoints'
import { ApiError } from '@/api/client'
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/api/types'
import { Can } from '@/auth/guards'
import { useAuth } from '@/auth/AuthContext'
import { PageHeader } from '@/components/layout/AppLayout'
import { DataTable } from '@/components/DataTable'
import { SearchInput } from '@/components/SearchInput'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useListParams } from '@/hooks/useListParams'
import { downloadCsv, toCsv } from '@/lib/csv'
import { fetchAll } from '@/lib/fetchAll'
import { formatCurrency, formatDateTime, statusLabel } from '@/lib/format'

const column = createColumnHelper<Order>()

const columns = [
  column.accessor('number', { header: 'Order', cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
  column.accessor('customerName', { header: 'Customer' }),
  column.accessor('city', { header: 'City', enableSorting: false }),
  column.accessor('createdAt', { header: 'Date', cell: (c) => formatDateTime(c.getValue()) }),
  column.accessor('status', { header: 'Status', cell: (c) => <StatusBadge status={c.getValue()} /> }),
  column.accessor('total', {
    header: 'Total',
    cell: (c) => <span className="font-medium">{formatCurrency(c.getValue(), true)}</span>,
  }),
]

const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  card: 'Credit card',
  transfer: 'Bank transfer',
  cash_on_delivery: 'Cash on delivery',
}

export function OrdersPage() {
  const { page, pageSize, search, sort, filters, update } = useListParams(['status'] as const)
  const status = filters.status as OrderStatus | undefined
  const [selected, setSelected] = useState<Order | null>(null)
  const [exporting, setExporting] = useState(false)

  const query = { page, pageSize, search, sort, status }
  const orders = useQuery({
    queryKey: ['orders', query],
    queryFn: () => ordersApi.list(query),
    placeholderData: keepPreviousData, // keep the old page visible while the next one loads
  })

  const exportCsv = async () => {
    setExporting(true)
    try {
      const all = await fetchAll((p) => ordersApi.list({ ...query, page: p, pageSize: 100 }))
      const csv = toCsv(all, [
        { header: 'Order', value: (o) => o.number },
        { header: 'Customer', value: (o) => o.customerName },
        { header: 'City', value: (o) => o.city },
        { header: 'Date', value: (o) => o.createdAt },
        { header: 'Status', value: (o) => o.status },
        { header: 'Total', value: (o) => o.total },
      ])
      downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, csv)
      track('orders_exported', { rows: all.length, status_filter: status ?? 'all' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track and update customer orders"
        actions={
          <Can permission="data:export">
            <Button variant="secondary" onClick={exportCsv} disabled={exporting || !orders.data?.total}>
              <Download size={16} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </Can>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <SearchInput value={search} onChange={(v) => update({ search: v })} placeholder="Search order, customer or city" />
          <Select
            aria-label="Filter by status"
            value={status ?? ''}
            onChange={(e) => update({ status: e.target.value })}
            className="sm:w-48"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </div>

        {orders.isError ? (
          <ErrorState message="Could not load orders." onRetry={() => orders.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={orders.data?.data ?? []}
            total={orders.data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            sort={sort}
            isLoading={orders.isLoading}
            isFetching={orders.isFetching}
            onPageChange={(p) => update({ page: p }, false)}
            onSortChange={(s) => update({ sort: s })}
            onRowClick={(order: Order) => {
              track('order_opened', { status: order.status })
              setSelected(order)
            }}
            empty={<EmptyState icon={<ShoppingCart size={32} />} title="No orders found" description="Try a different search or status." />}
          />
        )}
      </Card>

      <OrderDrawer order={selected} onClose={() => setSelected(null)} onUpdated={setSelected} />
    </div>
  )
}

function OrderDrawer({ order, onClose, onUpdated }: { order: Order | null; onClose: () => void; onUpdated: (o: Order) => void }) {
  const queryClient = useQueryClient()
  const { can } = useAuth()

  const mutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(order!.id, status),
    onSuccess: (updated) => {
      if (order) track('order_status_changed', { from: order.status, to: updated.status })
      onUpdated(updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const locked = order?.status === 'delivered' || order?.status === 'cancelled'

  return (
    <Modal open={order !== null} title={order ? `Order ${order.number}` : ''} onClose={onClose} side>
      {order && (
        <div className="space-y-6 text-sm">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">City</dt>
              <dd className="font-medium">{order.city}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date</dt>
              <dd className="font-medium">{formatDateTime(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment</dt>
              <dd className="font-medium">{PAYMENT_LABELS[order.paymentMethod]}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 font-semibold">Items</h3>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3 px-3 py-2">
                  <span>
                    {item.name} <span className="text-slate-400">× {item.quantity}</span>
                  </span>
                  <span>{formatCurrency(item.unitPrice * item.quantity, true)}</span>
                </li>
              ))}
              <li className="flex justify-between px-3 py-2 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total, true)}</span>
              </li>
            </ul>
          </div>

          <div>
            <label htmlFor="order-status" className="mb-1 block font-semibold">
              Status
            </label>
            {can('orders:update') && !locked ? (
              <Select
                id="order-status"
                value={order.status}
                disabled={mutation.isPending}
                onChange={(e) => mutation.mutate(e.target.value as OrderStatus)}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </Select>
            ) : (
              <div>
                <StatusBadge status={order.status} />
                <p className="mt-1 text-xs text-slate-500">
                  {locked ? `${statusLabel(order.status)} orders cannot be changed.` : 'Your role can view orders but not change them.'}
                </p>
              </div>
            )}
            {mutation.isError && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {mutation.error instanceof ApiError ? mutation.error.message : 'Update failed'}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
