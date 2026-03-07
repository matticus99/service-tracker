import { useState, useMemo } from 'react'
import {
  Search,
  Droplets,
  Wrench,
  ChevronRight,
  X,
  Inbox,
} from 'lucide-react'
import { useServiceHistory } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  formatDate,
  formatDateLong,
  formatMileage,
} from '@/lib/format'
import { groupByMonth } from '@/lib/history'
import type { ServiceHistoryEntry, OilChange, ServiceRecord } from '@/types/api'

type TypeFilter = 'all' | 'oil_change' | 'service'

export function HistoryPage() {
  const { vehicleId } = useVehicle()
  const { data: entries, isLoading, error, refetch } = useServiceHistory(vehicleId)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<ServiceHistoryEntry | null>(null)

  const facilities = useMemo(() => {
    if (!entries) return []
    const set = new Set<string>()
    for (const e of entries) {
      if (e.data.facility) set.add(e.data.facility)
    }
    return Array.from(set).sort()
  }, [entries])

  const [facilityFilter, setFacilityFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!entries) return []
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false
      if (facilityFilter !== 'all' && e.data.facility !== facilityFilter)
        return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const facility = e.data.facility?.toLowerCase() ?? ''
        const notes = e.data.notes?.toLowerCase() ?? ''
        const services =
          e.type === 'service'
            ? (e.data as ServiceRecord).services_performed?.join(' ').toLowerCase() ?? ''
            : ''
        if (
          !facility.includes(q) &&
          !notes.includes(q) &&
          !services.includes(q)
        )
          return false
      }
      return true
    })
  }, [entries, typeFilter, facilityFilter, searchQuery])

  const grouped = useMemo(() => groupByMonth(filtered), [filtered])

  if (isLoading) return <PageSkeleton cards={4} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="px-3 py-2 bg-bg-card border border-border-default rounded-full text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="all">All Types</option>
          <option value="oil_change">Oil Changes</option>
          <option value="service">Service Records</option>
        </select>

        {facilities.length > 0 && (
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="px-3 py-2 bg-bg-card border border-border-default rounded-full text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="all">All Facilities</option>
            {facilities.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center">
          {searchOpen ? (
            <div className="flex items-center gap-1 bg-bg-card border border-border-default rounded-full px-3">
              <Search className="w-4 h-4 text-text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent text-sm py-2 focus:outline-none w-40 text-text-primary"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-card rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-10 h-10" />}
          title="No service history"
          description="Service records and oil changes will appear here"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([month, items]) => (
            <section key={month}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 sticky top-0 bg-bg-body py-1 z-10">
                {month}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {items.map((entry, i) => (
                  <ServiceCard
                    key={
                      entry.type === 'oil_change'
                        ? (entry.data as OilChange).id
                        : (entry.data as ServiceRecord).id
                    }
                    entry={entry}
                    delay={i * 0.04}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedEntry && (
        <DetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}

function ServiceCard({
  entry,
  delay,
  onClick,
}: {
  entry: ServiceHistoryEntry
  delay: number
  onClick: () => void
}) {
  const isOil = entry.type === 'oil_change'
  const d = entry.data

  return (
    <Card delay={delay} onClick={onClick} className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isOil ? 'bg-accent-subtle' : 'bg-purple-500/10'
        }`}
      >
        {isOil ? (
          <Droplets className="w-4 h-4 text-accent" />
        ) : (
          <Wrench className="w-4 h-4 text-purple-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {d.facility ?? (isOil ? 'Oil Change' : 'Service')}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>{formatDate(d.service_date)}</span>
          {d.odometer != null && (
            <span className="font-mono">{formatMileage(d.odometer)} mi</span>
          )}
        </div>
        {!isOil && (entry.data as ServiceRecord).services_performed && (
          <div className="text-xs text-text-muted truncate mt-0.5">
            {(entry.data as ServiceRecord)
              .services_performed!.slice(0, 3)
              .join(', ')}
            {(entry.data as ServiceRecord).services_performed!.length > 3 &&
              ` +${(entry.data as ServiceRecord).services_performed!.length - 3} more`}
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
    </Card>
  )
}

function DetailModal({
  entry,
  onClose,
}: {
  entry: ServiceHistoryEntry
  onClose: () => void
}) {
  const isOil = entry.type === 'oil_change'
  const d = entry.data

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isOil ? 'Oil Change' : 'Service Record'}
    >
      <div className="space-y-3">
        {d.facility && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              Facility
            </div>
            <div className="text-sm">{d.facility}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-text-muted uppercase tracking-wider">
            Date
          </div>
          <div className="text-sm">{formatDateLong(d.service_date)}</div>
        </div>
        {d.odometer != null && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              Odometer
            </div>
            <div className="text-sm font-mono">
              {formatMileage(d.odometer)} mi
            </div>
          </div>
        )}
        {isOil && (d as OilChange).interval_miles != null && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              Interval
            </div>
            <div className="text-sm font-mono">
              {formatMileage((d as OilChange).interval_miles!)} mi
              {(d as OilChange).interval_months != null &&
                ` / ${((d as OilChange).interval_months!).toFixed(1)} months`}
            </div>
          </div>
        )}
        {!isOil && (d as ServiceRecord).services_performed && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              Services
            </div>
            <ul className="text-sm space-y-0.5 mt-1">
              {(d as ServiceRecord).services_performed!.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-text-muted shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.notes && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              Notes
            </div>
            <div className="text-sm text-text-secondary">{d.notes}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
