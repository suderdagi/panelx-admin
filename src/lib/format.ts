const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
const currencyPrecise = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const number = new Intl.NumberFormat('tr-TR')
const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const formatCurrency = (value: number, precise = false) =>
  (precise ? currencyPrecise : currency).format(value)
export const formatNumber = (value: number) => number.format(value)
export const formatDate = (iso: string) => date.format(new Date(iso))
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

export function formatChange(change: number | null) {
  if (change === null) return '—'
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
}

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((now - Date.parse(iso)) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export const statusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)
