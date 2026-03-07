export function formatMileage(miles: number): string {
  return miles.toLocaleString('en-US')
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

export function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMonthYear(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export function statusColor(status: string | null): string {
  switch (status) {
    case 'overdue':
      return 'status-overdue'
    case 'due_soon':
      return 'status-due-soon'
    case 'ok':
      return 'status-ok'
    case 'ad_hoc':
      return 'status-adhoc'
    default:
      return 'status-adhoc'
  }
}

export function statusLabel(status: string | null): string {
  switch (status) {
    case 'overdue':
      return 'Overdue'
    case 'due_soon':
      return 'Due Soon'
    case 'ok':
      return 'OK'
    case 'ad_hoc':
      return 'Ad-Hoc'
    default:
      return 'Unknown'
  }
}
