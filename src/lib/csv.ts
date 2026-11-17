/**
 * Builds a CSV string. Values containing commas, quotes or new lines are quoted,
 * and a leading "=", "+", "-" or "@" is escaped so spreadsheets don't run it as a formula.
 */
export function toCsv<T>(rows: T[], columns: { header: string; value: (row: T) => string | number }[]): string {
  const escape = (raw: string | number) => {
    let value = String(raw)
    if (typeof raw === 'string' && /^[=+\-@]/.test(value)) value = `'${value}`
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  }

  const lines = [
    columns.map((c) => escape(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => escape(c.value(row))).join(',')),
  ]
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  // The BOM makes Excel read Turkish characters correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
