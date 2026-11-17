import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { Users } from 'lucide-react'
import { customersApi } from '@/api/endpoints'
import type { Customer } from '@/api/types'
import { PageHeader } from '@/components/layout/AppLayout'
import { DataTable } from '@/components/DataTable'
import { SearchInput } from '@/components/SearchInput'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { useListParams } from '@/hooks/useListParams'
import { formatCurrency, formatDate } from '@/lib/format'

const column = createColumnHelper<Customer>()

const columns = [
  column.accessor('name', {
    header: 'Customer',
    cell: (c) => (
      <div>
        <p className="font-medium">{c.getValue()}</p>
        <p className="text-xs text-slate-500">{c.row.original.email}</p>
      </div>
    ),
  }),
  column.accessor('city', { header: 'City' }),
  column.accessor('ordersCount', { header: 'Orders' }),
  column.accessor('totalSpent', { header: 'Total spent', cell: (c) => <span className="font-medium">{formatCurrency(c.getValue())}</span> }),
  column.accessor('createdAt', { header: 'Customer since', cell: (c) => formatDate(c.getValue()) }),
]

export function CustomersPage() {
  const { page, pageSize, search, sort, update } = useListParams()
  const query = { page, pageSize, search, sort }

  const customers = useQuery({
    queryKey: ['customers', query],
    queryFn: () => customersApi.list(query),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageHeader title="Customers" description="Everyone who has an account in the store" />
      <Card>
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <SearchInput value={search} onChange={(v) => update({ search: v })} placeholder="Search name, email or city" />
        </div>
        {customers.isError ? (
          <ErrorState message="Could not load customers." onRetry={() => customers.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={customers.data?.data ?? []}
            total={customers.data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            sort={sort}
            isLoading={customers.isLoading}
            isFetching={customers.isFetching}
            onPageChange={(p) => update({ page: p }, false)}
            onSortChange={(s) => update({ sort: s })}
            empty={<EmptyState icon={<Users size={32} />} title="No customers found" />}
          />
        )}
      </Card>
    </div>
  )
}
