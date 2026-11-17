import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Keeps table state (page, search, sort and extra filters) in the URL,
 * so a filtered view can be refreshed, bookmarked or shared as a link.
 */
export function useListParams<F extends string>(filterKeys: readonly F[] = [], pageSize = 10) {
  const [params, setParams] = useSearchParams()

  const state = useMemo(() => {
    const filters = Object.fromEntries(filterKeys.map((key) => [key, params.get(key) ?? undefined])) as Record<
      F,
      string | undefined
    >
    return {
      page: Math.max(1, Number(params.get('page')) || 1),
      pageSize,
      search: params.get('search') ?? '',
      sort: params.get('sort') ?? undefined,
      filters,
    }
    // filterKeys is a constant array defined by the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, pageSize])

  const update = useCallback(
    (changes: Record<string, string | number | undefined>, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          if (resetPage && !('page' in changes)) next.delete('page')
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  return { ...state, update }
}
