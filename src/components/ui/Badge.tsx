import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import type { OrderStatus } from '@/api/types'
import { statusLabel } from '@/lib/format'

type Tone = 'gray' | 'green' | 'yellow' | 'blue' | 'red' | 'indigo'

const TONES: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
}

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone])}>
      {children}
    </span>
  )
}

const STATUS_TONES: Record<OrderStatus, Tone> = {
  pending: 'yellow',
  processing: 'indigo',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'red',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{statusLabel(status)}</Badge>
}
