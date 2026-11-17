import type { ReactNode } from 'react'

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 text-slate-400">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-indigo-600 hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}
