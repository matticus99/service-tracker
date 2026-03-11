import type { OilChange, ServiceRecord, Observation, ServiceHistoryEntry } from '@/types/api'
import { formatMonthYear } from './format'

function getEntryDate(entry: ServiceHistoryEntry): string {
  if (entry.type === 'observation') return entry.data.observation_date
  return entry.data.service_date
}

export function mergeHistory(
  oilChanges: OilChange[],
  serviceRecords: ServiceRecord[],
  observations: Observation[] = [],
): ServiceHistoryEntry[] {
  const merged: ServiceHistoryEntry[] = [
    ...oilChanges.map((oc) => ({ type: 'oil_change' as const, data: oc })),
    ...serviceRecords.map((sr) => ({ type: 'service' as const, data: sr })),
    ...observations.map((obs) => ({ type: 'observation' as const, data: obs })),
  ]
  merged.sort((a, b) => {
    const dateA = getEntryDate(a)
    const dateB = getEntryDate(b)
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
    const key = formatMonthYear(getEntryDate(entry))
    const existing = groups.get(key)
    if (existing) {
      existing.push(entry)
    } else {
      groups.set(key, [entry])
    }
  }
  return Array.from(groups.entries())
}
