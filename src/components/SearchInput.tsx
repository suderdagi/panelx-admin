import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

/** Search box that only reports changes after the user stops typing. */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text, 300)

  // The address can change without any typing (sidebar link, browser back button): show it
  useEffect(() => {
    if (value !== debounced) setText(value)
    // only react to the address, not to what is being typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // only react to the debounced text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="relative w-full sm:w-72">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  )
}
