import type { Paginated } from '@/api/types'

/** Reads page, pageSize, search and sort from a request URL with safe defaults. */
export function readListParams(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 10))
  const search = url.searchParams.get('search')?.trim().toLocaleLowerCase('tr') ?? ''
  const [sortField, sortDir] = (url.searchParams.get('sort') ?? '').split(':')
  return { page, pageSize, search, sortField, sortDir: sortDir === 'asc' ? 1 : -1 }
}

export function matches(search: string, ...values: (string | number)[]) {
  return !search || values.some((v) => String(v).toLocaleLowerCase('tr').includes(search))
}

export function sortBy<T>(items: T[], field: string | undefined, dir: number): T[] {
  if (!field) return items
  return [...items].sort((a, b) => {
    const x = (a as Record<string, unknown>)[field]
    const y = (b as Record<string, unknown>)[field]
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
    return String(x).localeCompare(String(y), 'tr') * dir
  })
}

export function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize
  return { data: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}
