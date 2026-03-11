import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  Wrench,
  ChevronRight,
  Inbox,
  Plus,
  StickyNote,
  Link as LinkIcon,
  Gauge,
  Store,
  DollarSign,
  FileText,
  Paperclip,
} from 'lucide-react'
import { useServiceHistory, useCategories, useShops, useObservations } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttachmentSection } from '@/components/attachments/AttachmentSection'
import { AddServiceRecordModal } from '@/components/forms/AddServiceRecordModal'
import { AddObservationModal } from '@/components/forms/AddObservationModal'
import {
  formatMileage,
  formatCurrency,
} from '@/lib/format'
import { groupByMonth } from '@/lib/history'
import type {
  ServiceHistoryEntry,
  OilChange,
  ServiceRecord,
  Observation,
  ServiceCategory,
} from '@/types/api'

type ServiceEntry =
  | { type: 'oil_change'; data: OilChange }
  | { type: 'service'; data: ServiceRecord }

export function HistoryPage() {
  const { vehicleId, vehicle } = useVehicle()
  const { data: entries, isLoading, error, refetch } = useServiceHistory(vehicleId)
  const { data: categories } = useCategories()
  const { data: shops } = useShops(vehicleId)
  const { data: observations } = useObservations(vehicleId)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [shopFilter, setShopFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<ServiceHistoryEntry | null>(null)
  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const serviceNames = useMemo(() => {
    if (!entries) return []
    const set = new Set<string>()
    for (const e of entries) {
      if (e.type === 'service') {
        const sr = e.data as ServiceRecord
        sr.items?.forEach((item) => {
          const name = getServiceName(item.service_definition_id, item.custom_service_name, categories ?? [])
          if (name) set.add(name)
        })
        sr.services_performed?.forEach((s) => set.add(s))
      }
    }
    return Array.from(set).sort()
  }, [entries, categories])

  const hasActiveFilter = categoryFilter || serviceFilter || shopFilter

  const filtered = useMemo(() => {
    if (!entries) return []
    return entries.filter((e) => {
      if (e.type === 'observation') {
        if (hasActiveFilter) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const obs = e.data as Observation
          if (!obs.observation.toLowerCase().includes(q)) return false
        }
        return true
      }

      const isOil = e.type === 'oil_change'
      const sr = isOil ? null : (e.data as ServiceRecord)

      if (categoryFilter && sr) {
        const hasCategory = sr.items?.some((item) => {
          const cat = findCategoryForService(item.service_definition_id, categories ?? [])
          return cat?.id === categoryFilter
        })
        if (!hasCategory) return false
      } else if (categoryFilter && isOil) {
        return false
      }

      if (serviceFilter && sr) {
        const hasService = sr.items?.some((item) => {
          const name = getServiceName(item.service_definition_id, item.custom_service_name, categories ?? [])
          return name === serviceFilter
        }) || sr.services_performed?.includes(serviceFilter)
        if (!hasService) return false
      } else if (serviceFilter && isOil) {
        return false
      }

      if (shopFilter) {
        if (sr && sr.shop_id !== shopFilter) return false
        if (isOil) return false
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const facility = e.data.facility?.toLowerCase() ?? ''
        const notes = e.data.notes?.toLowerCase() ?? ''
        const services = sr
          ? (sr.items?.map((item) =>
              getServiceName(item.service_definition_id, item.custom_service_name, categories ?? []),
            ).join(' ').toLowerCase() ?? '') +
            ' ' +
            (sr.services_performed?.join(' ').toLowerCase() ?? '')
          : ''
        const shopName = sr?.shop_id
          ? (shops?.find((s) => s.id === sr.shop_id)?.name ?? '').toLowerCase()
          : facility
        if (
          !facility.includes(q) &&
          !notes.includes(q) &&
          !services.includes(q) &&
          !shopName.includes(q)
        )
          return false
      }
      return true
    })
  }, [entries, categoryFilter, serviceFilter, shopFilter, searchQuery, categories, shops, hasActiveFilter])

  const grouped = useMemo(() => groupByMonth(filtered), [filtered])

  if (isLoading) return <PageSkeleton cards={4} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  const currentMileage = vehicle?.current_mileage ?? 0

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex-1 min-w-[130px] md:flex-1 md:max-w-[200px] px-2.5 py-[7px] bg-bg-card border border-border-default rounded-[10px] text-[0.8rem] text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent bg-[length:12px] bg-no-repeat bg-[right_12px_center] pr-8"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23828BA3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
        >
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="flex-1 min-w-[130px] md:flex-1 md:max-w-[200px] px-2.5 py-[7px] bg-bg-card border border-border-default rounded-[10px] text-[0.8rem] text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent bg-[length:12px] bg-no-repeat bg-[right_12px_center] pr-8"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23828BA3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
        >
          <option value="">All Services</option>
          {serviceNames.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="flex-1 min-w-[130px] md:flex-1 md:max-w-[200px] px-2.5 py-[7px] bg-bg-card border border-border-default rounded-[10px] text-[0.8rem] text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent bg-[length:12px] bg-no-repeat bg-[right_12px_center] pr-8"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23828BA3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
        >
          <option value="">All Shops</option>
          {shops?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <button
          onClick={() => {
            if (searchOpen) {
              setSearchOpen(false)
              setSearchQuery('')
            } else {
              setSearchOpen(true)
            }
          }}
          className="w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-bg-card transition-colors"
          title="Search"
        >
          <Search className="w-5 h-5 text-text-secondary" />
        </button>

        {searchOpen && (
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records..."
            className="flex-1 min-w-[120px] px-2.5 py-[7px] bg-bg-card border border-border-default rounded-[10px] text-[0.8rem] text-text-primary focus:outline-none focus:border-accent"
            autoFocus
          />
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setAddDropdownOpen(!addDropdownOpen)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-[7px] bg-accent text-white rounded-[10px] font-semibold text-[0.8rem] hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
          {addDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-bg-elevated border border-border-default rounded-[10px] min-w-[180px] z-50 shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">
              <button
                onClick={() => {
                  setAddDropdownOpen(false)
                  setAddServiceOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <Wrench className="w-4 h-4 text-text-secondary" /> Service Record
              </button>
              <button
                onClick={() => {
                  setAddDropdownOpen(false)
                  setAddNoteOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <StickyNote className="w-4 h-4 text-text-secondary" /> Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-10 h-10" />}
          title="No service history"
          description="Service records and notes will appear here"
        />
      ) : (
        <div className="flex flex-col gap-0">
          {grouped.map(([month, items]) => (
            <section key={month}>
              <div className="font-bold text-[0.8rem] uppercase tracking-wider text-text-secondary my-5 pb-1.5 border-b border-border-subtle first:mt-1">
                {month}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {items.map((entry, i) => {
                  if (entry.type === 'observation') {
                    return (
                      <NoteCard
                        key={(entry.data as Observation).id}
                        observation={entry.data as Observation}
                        entries={entries ?? []}
                        categories={categories ?? []}
                        delay={i * 0.04}
                        onClick={() => setSelectedEntry(entry)}
                      />
                    )
                  }
                  return (
                    <HistoryCard
                      key={
                        entry.type === 'oil_change'
                          ? (entry.data as OilChange).id
                          : (entry.data as ServiceRecord).id
                      }
                      entry={entry}
                      categories={categories ?? []}
                      shops={shops ?? []}
                      delay={i * 0.04}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedEntry && vehicleId && selectedEntry.type !== 'observation' && (
        <DetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          vehicleId={vehicleId}
          categories={categories ?? []}
          shops={shops ?? []}
          observations={observations ?? []}
        />
      )}

      {vehicleId && (
        <>
          <AddServiceRecordModal
            open={addServiceOpen}
            onClose={() => setAddServiceOpen(false)}
            vehicleId={vehicleId}
            currentMileage={currentMileage}
          />
          <AddObservationModal
            open={addNoteOpen}
            onClose={() => setAddNoteOpen(false)}
            vehicleId={vehicleId}
            currentMileage={currentMileage}
          />
        </>
      )}
    </div>
  )
}

// Helpers

function getServiceName(
  serviceDefId: string | null,
  customName: string | null,
  categories: ServiceCategory[],
): string {
  if (customName) return customName
  if (!serviceDefId) return 'Unknown Service'
  for (const cat of categories) {
    for (const svc of cat.services) {
      if (svc.id === serviceDefId) return svc.name
    }
  }
  return 'Unknown Service'
}

function findCategoryForService(
  serviceDefId: string | null,
  categories: ServiceCategory[],
): ServiceCategory | null {
  if (!serviceDefId) return null
  for (const cat of categories) {
    for (const svc of cat.services) {
      if (svc.id === serviceDefId) return cat
    }
  }
  return null
}

function getServiceTitle(sr: ServiceRecord, categories: ServiceCategory[]): string {
  const itemNames = sr.items?.map((item) =>
    getServiceName(item.service_definition_id, item.custom_service_name, categories),
  ) ?? sr.services_performed ?? []
  if (itemNames.length === 0) return 'Service'
  if (itemNames.length === 1) return itemNames[0] ?? 'Service'
  return `${itemNames.length} Services`
}

function getSubServicesText(sr: ServiceRecord, categories: ServiceCategory[]): string | null {
  const itemNames = sr.items?.map((item) =>
    getServiceName(item.service_definition_id, item.custom_service_name, categories),
  ) ?? sr.services_performed ?? []
  if (itemNames.length <= 1) return null
  const shown = itemNames.slice(0, 3).join(', ')
  return itemNames.length > 3 ? `${shown} ...` : shown
}

// History service card

function HistoryCard({
  entry,
  categories,
  shops,
  delay,
  onClick,
}: {
  entry: ServiceEntry
  categories: ServiceCategory[]
  shops: { id: string; name: string }[]
  delay: number
  onClick: () => void
}) {
  const isOil = entry.type === 'oil_change'
  const d = entry.data

  const title = isOil
    ? 'Oil Change'
    : getServiceTitle(d as ServiceRecord, categories)

  const subServices = isOil
    ? null
    : getSubServicesText(d as ServiceRecord, categories)

  const sr = isOil ? null : (d as ServiceRecord)
  const dateStr = new Date(d.service_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const shopName = sr?.shop_id
    ? shops.find((s) => s.id === sr.shop_id)?.name ?? sr.facility ?? ''
    : d.facility ?? ''
  const cost = sr?.total_cost
  const costStr = cost != null && cost > 0 ? formatCurrency(cost) : cost === 0 ? 'Free' : ''
  const hasLinkedNotes = sr?.linked_observation_ids && sr.linked_observation_ids.length > 0

  return (
    <div
      className="bg-bg-card border border-border-default rounded-[14px] px-4 py-3.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border-default))] animate-card-in"
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-full bg-accent-subtle text-accent flex items-center justify-center shrink-0">
        <Wrench className="w-[18px] h-[18px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[0.88rem] truncate">{title}</div>
        {subServices && (
          <div className="text-[0.72rem] text-text-secondary mt-0.5">{subServices}</div>
        )}
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 items-center text-xs text-text-muted mt-0.5">
          <span>{dateStr}</span>
          {d.odometer != null && <span>{formatMileage(d.odometer)} mi</span>}
          {shopName && <span>{shopName}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasLinkedNotes && (
          <span className="text-text-muted">
            <LinkIcon className="w-3.5 h-3.5" />
          </span>
        )}
        {costStr && <span className="font-mono font-semibold text-sm">{costStr}</span>}
        <span className="text-text-muted">
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  )
}

// Note card

function NoteCard({
  observation,
  entries,
  categories,
  delay,
  onClick,
}: {
  observation: Observation
  entries: ServiceHistoryEntry[]
  categories: ServiceCategory[]
  delay: number
  onClick: () => void
}) {
  const dateStr = new Date(observation.observation_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const linkedService = useMemo(() => {
    if (!observation.linked_service_record_ids?.length) return null
    const srid = observation.linked_service_record_ids[0]
    const entry = entries.find(
      (e) => e.type === 'service' && (e.data as ServiceRecord).id === srid,
    )
    if (!entry) return null
    const sr = entry.data as ServiceRecord
    const svcDate = new Date(sr.service_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const title = getServiceTitle(sr, categories)
    return { date: svcDate, title }
  }, [observation.linked_service_record_ids, entries, categories])

  return (
    <div
      className="bg-bg-card border border-border-default border-l-[3.5px] border-l-accent rounded-[14px] px-3.5 py-3 cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)] animate-card-in"
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase text-accent tracking-wider">
          <StickyNote className="w-3 h-3" /> Note
        </span>
        {observation.resolved && (
          <span className="inline-flex items-center gap-1 px-1.5 py-px bg-status-ok-subtle text-status-ok rounded-full text-[0.6rem] font-semibold uppercase">
            Resolved
          </span>
        )}
      </div>
      <div className="text-[0.82rem] leading-[1.4] mb-1.5">{observation.observation}</div>
      <div className="flex gap-2.5 text-[0.7rem] text-text-muted items-center">
        <span>{dateStr}</span>
        {observation.odometer != null && <span>{formatMileage(observation.odometer)} mi</span>}
      </div>
      {linkedService && (
        <div className="inline-flex items-center gap-1 text-[0.65rem] text-text-secondary mt-1">
          <LinkIcon className="w-3 h-3" />
          {linkedService.date} &mdash; {linkedService.title}
        </div>
      )}
    </div>
  )
}

// Detail Modal (for service records)

function DetailModal({
  entry,
  onClose,
  vehicleId,
  categories,
  shops,
  observations,
}: {
  entry: ServiceEntry
  onClose: () => void
  vehicleId: string
  categories: ServiceCategory[]
  shops: { id: string; name: string; address?: string | null }[]
  observations: Observation[]
}) {
  const isOil = entry.type === 'oil_change'
  const d = entry.data
  const recordType = isOil ? 'oil_change' : 'service_record'

  const sr = isOil ? null : (d as ServiceRecord)
  const dateStr = new Date(d.service_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const shopObj = sr?.shop_id ? shops.find((s) => s.id === sr.shop_id) : null
  const shopName = shopObj?.name ?? d.facility ?? ''
  const shopAddress = shopObj?.address ?? ''

  // Group services by category
  const categoryGroups = useMemo(() => {
    if (!sr?.items?.length) return []
    const groups = new Map<string, { catName: string; services: { name: string; cost: number }[] }>()
    for (const item of sr.items) {
      const cat = findCategoryForService(item.service_definition_id, categories)
      const catName = cat?.name ?? 'Other'
      const catId = cat?.id ?? 'other'
      if (!groups.has(catId)) {
        groups.set(catId, { catName, services: [] })
      }
      groups.get(catId)!.services.push({
        name: getServiceName(item.service_definition_id, item.custom_service_name, categories),
        cost: item.cost ?? 0,
      })
    }
    return Array.from(groups.values())
  }, [sr?.items, categories])

  // Linked notes
  const linkedNotes = useMemo(() => {
    if (!sr?.linked_observation_ids?.length) return []
    return sr.linked_observation_ids
      .map((id) => observations.find((o) => o.id === id))
      .filter(Boolean) as Observation[]
  }, [sr?.linked_observation_ids, observations])

  const subtotal = sr?.items?.reduce((sum, item) => sum + (item.cost ?? 0), 0) ?? 0

  return (
    <Modal open={true} onClose={onClose} title="Service Record">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="text-lg font-bold">{dateStr}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.82rem] text-text-secondary mt-1 items-center">
            {d.odometer != null && (
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-text-muted" />
                {formatMileage(d.odometer)} mi
              </span>
            )}
            {shopName && (
              <span className="flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-text-muted" />
                {shopName}
              </span>
            )}
          </div>
          {shopAddress && (
            <div className="text-xs text-text-muted mt-0.5">{shopAddress}</div>
          )}
        </div>

        {/* Services Performed */}
        {categoryGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary">
                <Wrench className="w-4 h-4" /> Services Performed
              </div>
            </div>
            {categoryGroups.map((group, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wider text-text-muted pt-2.5 pb-1 mt-1 first:pt-0 first:mt-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-subtle text-accent border border-accent/30 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider">
                    {group.catName}
                  </span>
                </div>
                {group.services.map((svc, si) => (
                  <div
                    key={si}
                    className={`flex items-center justify-between gap-2 py-2 ${si < group.services.length - 1 ? 'border-b border-border-subtle' : ''}`}
                  >
                    <span className="text-sm font-medium">{svc.name}</span>
                    <span className="font-mono text-[0.82rem] text-text-secondary">
                      {formatCurrency(svc.cost)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Legacy services_performed display */}
        {!categoryGroups.length && sr?.services_performed?.length ? (
          <div>
            <div className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary mb-2.5">
              <Wrench className="w-4 h-4" /> Services Performed
            </div>
            {sr.services_performed.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-1 h-1 rounded-full bg-text-muted shrink-0" />
                {s}
              </div>
            ))}
          </div>
        ) : null}

        {/* Cost Summary */}
        {sr && (
          <div>
            <div className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary mb-2.5">
              <DollarSign className="w-4 h-4" /> Cost Summary
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span>Subtotal</span>
              <span className="font-mono text-[0.82rem]">{formatCurrency(subtotal)}</span>
            </div>
            {(sr.shop_fee ?? 0) > 0 && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-text-muted">Shop Fee</span>
                <span className="font-mono text-[0.82rem] text-text-muted">{formatCurrency(sr.shop_fee!)}</span>
              </div>
            )}
            {(sr.tax ?? 0) > 0 && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-text-muted">Tax</span>
                <span className="font-mono text-[0.82rem] text-text-muted">{formatCurrency(sr.tax!)}</span>
              </div>
            )}
            <div className="border-t border-dashed border-border-default my-1" />
            <div className="flex justify-between py-1.5 font-semibold">
              <span>Total</span>
              <span className="font-mono text-[0.82rem]">{formatCurrency(sr.total_cost ?? 0)}</span>
            </div>
          </div>
        )}

        {/* Linked Notes */}
        {linkedNotes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary mb-2.5">
              <LinkIcon className="w-4 h-4" /> Linked Notes
            </div>
            {linkedNotes.map((note) => {
              const nDate = new Date(note.observation_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <div
                  key={note.id}
                  className="bg-bg-card border border-border-default border-l-[3.5px] border-l-accent rounded-[14px] px-3.5 py-3 mb-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase text-accent tracking-wider">
                      <StickyNote className="w-3 h-3" /> Note
                    </span>
                  </div>
                  <div className="text-[0.82rem] leading-[1.4] mb-1.5">{note.observation}</div>
                  <div className="flex gap-2.5 text-[0.7rem] text-text-muted">
                    <span>{nDate}</span>
                    {note.odometer != null && <span>{formatMileage(note.odometer)} mi</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Record Notes */}
        {d.notes && (
          <div>
            <div className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary mb-2.5">
              <FileText className="w-4 h-4" /> Record Notes
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{d.notes}</p>
          </div>
        )}

        {/* Attachments */}
        <div>
          <div className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary mb-2.5">
            <Paperclip className="w-4 h-4" /> Attachments
          </div>
          <AttachmentSection
            vehicleId={vehicleId}
            recordType={recordType as 'oil_change' | 'service_record'}
            recordId={d.id}
          />
        </div>
      </div>
    </Modal>
  )
}
