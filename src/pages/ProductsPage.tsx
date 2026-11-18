import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { track } from '@/analytics/analytics'
import { productsApi } from '@/api/endpoints'
import { ApiError } from '@/api/client'
import { CATEGORIES, type Product } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Can } from '@/auth/guards'
import { PageHeader } from '@/components/layout/AppLayout'
import { DataTable } from '@/components/DataTable'
import { SearchInput } from '@/components/SearchInput'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useListParams } from '@/hooks/useListParams'
import { formatCurrency } from '@/lib/format'
import { productSchema, type ProductInput } from '@/lib/schemas'

const LOW_STOCK = 10

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge tone="red">Out of stock</Badge>
  if (stock < LOW_STOCK) return <Badge tone="yellow">{stock} left</Badge>
  return <span>{stock}</span>
}

const column = createColumnHelper<Product>()

export function ProductsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const { page, pageSize, search, sort, filters, update } = useListParams(['category', 'lowStock'] as const)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const query = { page, pageSize, search, sort, category: filters.category, lowStock: filters.lowStock === 'true' }
  const products = useQuery({
    queryKey: ['products', query],
    queryFn: () => productsApi.list(query),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      track('product_deleted')
      setDeleting(null)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const columns = [
    column.accessor('name', {
      header: 'Product',
      cell: (c) => (
        <div>
          <p className="font-medium">{c.getValue()}</p>
          <p className="text-xs text-slate-500">{c.row.original.sku}</p>
        </div>
      ),
    }),
    column.accessor('category', { header: 'Category' }),
    column.accessor('price', { header: 'Price', cell: (c) => formatCurrency(c.getValue(), true) }),
    column.accessor('stock', { header: 'Stock', cell: (c) => <StockBadge stock={c.getValue()} /> }),
    column.accessor('status', {
      header: 'Status',
      cell: (c) => <Badge tone={c.getValue() === 'active' ? 'green' : 'gray'}>{c.getValue() === 'active' ? 'Active' : 'Draft'}</Badge>,
    }),
    ...(can('products:write')
      ? [
          column.display({
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: (c) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(c.row.original)} aria-label={`Edit ${c.row.original.name}`}>
                  <Pencil size={14} />
                </Button>
                <Can permission="products:delete">
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(c.row.original)} aria-label={`Delete ${c.row.original.name}`}>
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </Can>
              </div>
            ),
          }),
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage the catalogue and stock levels"
        actions={
          <Can permission="products:write">
            <Button onClick={() => setEditing('new')}>
              <Plus size={16} /> Add product
            </Button>
          </Can>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <SearchInput value={search} onChange={(v) => update({ search: v })} placeholder="Search name or SKU" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 whitespace-nowrap text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                checked={filters.lowStock === 'true'}
                onChange={(e) => update({ lowStock: e.target.checked ? 'true' : undefined })}
              />
              Low stock only
            </label>
            <Select aria-label="Filter by category" value={filters.category ?? ''} onChange={(e) => update({ category: e.target.value })} className="w-44">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>

        {products.isError ? (
          <ErrorState message="Could not load products." onRetry={() => products.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={products.data?.data ?? []}
            total={products.data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            sort={sort}
            isLoading={products.isLoading}
            isFetching={products.isFetching}
            onPageChange={(p) => update({ page: p }, false)}
            onSortChange={(s) => update({ sort: s })}
            empty={<EmptyState icon={<Package size={32} />} title="No products found" />}
          />
        )}
      </Card>

      <ProductFormModal product={editing} onClose={() => setEditing(null)} />

      <Modal
        open={deleting !== null}
        title="Delete product"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Are you sure you want to delete <strong>{deleting?.name}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

const EMPTY: ProductInput = { name: '', sku: '', category: 'Electronics', price: 0, stock: 0, status: 'active' }

export function ProductFormModal({ product, onClose }: { product: Product | 'new' | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isNew = product === 'new'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({ resolver: zodResolver(productSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (product) reset(product === 'new' ? EMPTY : product)
  }, [product, reset])

  const save = useMutation({
    mutationFn: (input: ProductInput) => (product === 'new' || !product ? productsApi.create(input) : productsApi.update(product.id, input)),
    onSuccess: (_saved, input) => {
      track(isNew ? 'product_created' : 'product_updated', { category: input.category })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
  })

  return (
    <Modal
      open={product !== null}
      title={isNew ? 'Add product' : 'Edit product'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit((values) => save.mutate(values))} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Field label="Name" error={errors.name?.message}>
            {(props) => <Input {...props} {...register('name')} />}
          </Field>
        </div>
        <Field label="SKU" error={errors.sku?.message}>
          {(props) => <Input placeholder="ELE-1001" {...props} {...register('sku')} />}
        </Field>
        <Field label="Category" error={errors.category?.message}>
          {(props) => (
            <Select {...props} {...register('category')}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Price (₺)" error={errors.price?.message}>
          {(props) => <Input type="number" step="0.01" min="0" {...props} {...register('price', { valueAsNumber: true })} />}
        </Field>
        <Field label="Stock" error={errors.stock?.message}>
          {(props) => <Input type="number" min="0" {...props} {...register('stock', { valueAsNumber: true })} />}
        </Field>
        <Field label="Status" error={errors.status?.message}>
          {(props) => (
            <Select {...props} {...register('status')}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </Select>
          )}
        </Field>
        {save.isError && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {save.error instanceof ApiError ? save.error.message : 'Could not save the product'}
          </p>
        )}
      </form>
    </Modal>
  )
}
