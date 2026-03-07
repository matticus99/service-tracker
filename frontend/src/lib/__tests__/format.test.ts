import { describe, it, expect } from 'vitest'
import {
  formatMileage,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatMonthYear,
  statusColor,
  statusLabel,
} from '../format'

describe('formatMileage', () => {
  it('formats with commas', () => {
    expect(formatMileage(191083)).toBe('191,083')
  })

  it('handles zero', () => {
    expect(formatMileage(0)).toBe('0')
  })

  it('handles large numbers', () => {
    expect(formatMileage(1000000)).toBe('1,000,000')
  })

  it('handles small numbers without commas', () => {
    expect(formatMileage(999)).toBe('999')
  })
})

describe('formatCurrency', () => {
  it('formats with dollar sign and two decimals', () => {
    expect(formatCurrency(65)).toBe('$65.00')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('handles fractional amounts', () => {
    expect(formatCurrency(13.3)).toBe('$13.30')
  })

  it('rounds to two decimals', () => {
    expect(formatCurrency(10.999)).toBe('$11.00')
  })
})

describe('formatDate', () => {
  it('formats ISO date to MM/DD/YYYY', () => {
    expect(formatDate('2025-11-29')).toBe('11/29/2025')
  })

  it('formats beginning of year', () => {
    expect(formatDate('2025-01-01')).toBe('01/01/2025')
  })
})

describe('formatDateLong', () => {
  it('formats to long month name', () => {
    expect(formatDateLong('2025-11-29')).toBe('November 29, 2025')
  })
})

describe('formatMonthYear', () => {
  it('extracts month and year', () => {
    expect(formatMonthYear('2025-11-29')).toBe('November 2025')
  })
})

describe('statusColor', () => {
  it('returns correct class for overdue', () => {
    expect(statusColor('overdue')).toBe('status-overdue')
  })

  it('returns correct class for due_soon', () => {
    expect(statusColor('due_soon')).toBe('status-due-soon')
  })

  it('returns correct class for ok', () => {
    expect(statusColor('ok')).toBe('status-ok')
  })

  it('returns correct class for ad_hoc', () => {
    expect(statusColor('ad_hoc')).toBe('status-adhoc')
  })

  it('returns default class for null', () => {
    expect(statusColor(null)).toBe('status-adhoc')
  })

  it('returns default class for unknown status', () => {
    expect(statusColor('something_else')).toBe('status-adhoc')
  })
})

describe('statusLabel', () => {
  it('returns Overdue for overdue', () => {
    expect(statusLabel('overdue')).toBe('Overdue')
  })

  it('returns Due Soon for due_soon', () => {
    expect(statusLabel('due_soon')).toBe('Due Soon')
  })

  it('returns OK for ok', () => {
    expect(statusLabel('ok')).toBe('OK')
  })

  it('returns Ad-Hoc for ad_hoc', () => {
    expect(statusLabel('ad_hoc')).toBe('Ad-Hoc')
  })

  it('returns Unknown for null', () => {
    expect(statusLabel(null)).toBe('Unknown')
  })

  it('returns Unknown for unrecognized status', () => {
    expect(statusLabel('invalid')).toBe('Unknown')
  })
})
