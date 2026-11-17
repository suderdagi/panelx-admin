import { clsx } from 'clsx'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Spinner } from './ui/Spinner'

interface DataTableProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- column value types differ per column
  columns: ColumnDef<T, any>[]
  data: T[]
  total: number
  page: number
  pageSize: number
  sort?: string
  isLoading?: boolean
  isFetching?: boolean
  empty?: ReactNode
  onPageChange: (page: number) => void
  onSortChange: (sort: string | undefined) => void
  onRowClick?: (row: T) => void
}

/**
 * Table with server-side sorting and pagination: TanStack Table renders the
 * columns, while the page and sort state live in the URL and are sent to the API.
 */
export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  sort,
  isLoading,
  isFetching,
  empty,
  onPageChange,
  onSortChange,
  onRowClick,
}: DataTableProps<T>) {
  const [sortField, sortDir] = sort?.split(':') ?? []
  const sorting: SortingState = sortField ? [{ id: sortField, desc: sortDir === 'desc' }] : []

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSortChange(next[0] ? `${next[0].id}:${next[0].desc ? 'desc' : 'asc'}` : undefined)
    },
  })

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div>
      <div className={clsx('overflow-x-auto transition-opacity', isFetching && !isLoading && 'opacity-60')}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const direction = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 font-medium"
                      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
                    >
                      {canSort ? (
                        <button
                          className="inline-flex items-center gap-1 uppercase hover:text-slate-900 dark:hover:text-white"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {direction === 'asc' ? <ArrowUp size={12} /> : direction === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={clsx(onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50')}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <Spinner />}
        {!isLoading && data.length === 0 && empty}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          {from}–{to} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            Page {page} / {pageCount}
          </span>
          <button
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
