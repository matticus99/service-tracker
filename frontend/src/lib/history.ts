import type { OilChange, ServiceRecord, ServiceHistoryEntry } from '@/types/api'
import { formatMonthYear } from './format'

export function mergeHistory(
  oilChanges: OilChange[],
  serviceRecords: ServiceRecord[],
): ServiceHistoryEntry[] {
  const merged: ServiceHistoryEntry[] = [
    ...oilChanges.map((oc) => ({ type: 'oil_change' as const, data: oc })),
    ...serviceRecords.map((sr) => ({ type: 'service' as const, data: sr })),
  ]
  merged.sort((a, b) => {
    const dateA = a.data.service_date
    const dateB = b.data.service_date
    if (dateA !== dateB) return dateB.localeCompare(dateA)
    return b.data.created_at.localeCompare(a.data.created_at)
  })
  return merged
}

export function groupByMonth(
  entries: ServiceHistoryEntry[],
): [string, ServiceHistoryEntry[]][] {
  const groups = new Map<string, ServiceHistoryEntry[]>()
  for (const entry of entries) {
    const key = formatMonthYear(entry.data.service_date)
    const existing = groups.get(key)
    if (existing) {
      existing.push(entry)
    } else {
      groups.set(key, [entry])
    }
  }
  return Array.from(groups.entries())
}
