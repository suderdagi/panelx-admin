import type { Paginated } from '@/api/types'

/** Fetches every page of a paginated endpoint, e.g. for CSV export. */
export async function fetchAll<T>(fetchPage: (page: number) => Promise<Paginated<T>>): Promise<T[]> {
  const first = await fetchPage(1)
  const pages = Math.ceil(first.total / first.pageSize)
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2)))
  return [first, ...rest].flatMap((p) => p.data)
}
