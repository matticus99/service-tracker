import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  Gauge,
  Calendar,
  DollarSign,
  Tag,
  MapPin,
} from 'lucide-react'
import {
  useIntervalItems,
  useCategories,
  useSettings,
  useMarkServiced,
} from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { IntervalItemFormModal } from '@/components/forms/IntervalItemFormModal'
import { ShopAutocomplete } from '@/components/forms/ShopAutocomplete'
import { formatMileage, formatCurrency } from '@/lib/format'
import type { IntervalItem, IntervalStatus, ServiceCategory } from '@/types/api'

const STATUS_ORDER: IntervalStatus[] = ['overdue', 'due_soon', 'ok', 'ad_hoc']
const STATUS_LABELS: Record<IntervalStatus, string> = {
  overdue: 'Overdue',
  due_soon: 'Due Soon',
  ok: 'OK',
  ad_hoc: 'Ad-Hoc',
}
const DOT_COLORS: Record<IntervalStatus, string> = {
  overdue: 'bg-status-overdue',
  due_soon: 'bg-status-due-soon',
  ok: 'bg-status-ok',
  ad_hoc: 'bg-status-adhoc',
}

type GroupMode = 'status' | 'category'

export function TrackerPage() {
  const { vehicleId, vehicle } = useVehicle()
  const { data: items, isLoading, error, refetch } = useIntervalItems(vehicleId)
  const { data: categories } = useCategories()
  const { data: settings } = useSettings()
  const [searchParams] = useSearchParams()
  const highlightStatus = searchParams.get('status')
  const [createOpen, setCreateOpen] = useState(false)
  const [groupMode, setGroupMode] = useState<GroupMode>('status')

  const allItems = items ?? []

  const statusGroups = useMemo(() => {
    const groups = new Map<IntervalStatus, IntervalItem[]>()
    for (const status of STATUS_ORDER) groups.set(status, [])
    for (const item of allItems) {
      const s = (item.status ?? 'ad_hoc') as IntervalStatus
      groups.get(s)?.push(item)
    }
    return groups
  }, [allItems])

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, { name: string; items: IntervalItem[] }>()
    for (const item of allItems) {
      const catId = item.category_id ?? 'uncategorized'
      if (!groups.has(catId)) {
        const catName = categories?.find((c) => c.id === catId)?.name ?? 'Uncategorized'
        groups.set(catId, { name: catName, items: [] })
      }
      groups.get(catId)!.items.push(item)
    }
    return Array.from(groups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))
  }, [allItems, categories])

  if (isLoading) return <PageSkeleton cards={4} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="p-4 max-w-5xl mx-auto flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-1">
        <div className="inline-flex bg-bg-card border border-border-default rounded-[10px] overflow-hidden">
          <button
            onClick={() => setGroupMode('status')}
            className={`px-4 py-[7px] text-[0.78rem] font-semibold transition-all ${
              groupMode === 'status'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
            }`}
          >
            By Status
          </button>
          <button
            onClick={() => setGroupMode('category')}
            className={`px-4 py-[7px] text-[0.78rem] font-semibold transition-all ${
              groupMode === 'category'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
            }`}
          >
            By Category
          </button>
        </div>
        <span className="text-xs text-text-muted font-medium">
          {allItems.length} tracked items
        </span>
      </div>

      {allItems.length === 0 ? (
        <EmptyState
          icon={<Gauge className="w-10 h-10" />}
          title="No interval items"
          description="Add maintenance items to track their service intervals"
        />
      ) : (
        <>
          {groupMode === 'status'
            ? STATUS_ORDER.map((status) => {
                const sectionItems = statusGroups.get(status) ?? []
                if (sectionItems.length === 0) return null
                return (
                  <TrackerSection
                    key={status}
                    label={STATUS_LABELS[status]}
                    dotColor={DOT_COLORS[status]}
                    isOverdue={status === 'overdue'}
                    count={sectionItems.length}
                    items={sectionItems}
                    currentMileage={vehicle?.current_mileage ?? 0}
                    vehicleId={vehicleId!}
                    categories={categories ?? []}
                    defaultExpanded={
                      status === 'overdue' ||
                      status === 'due_soon' ||
                      highlightStatus === status
                    }
                  />
                )
              })
            : categoryGroups.map(([catId, group]) => (
                <TrackerSection
                  key={catId}
                  label={group.name}
                  dotColor="bg-accent"
                  isOverdue={false}
                  count={group.items.length}
                  items={group.items}
                  currentMileage={vehicle?.current_mileage ?? 0}
                  vehicleId={vehicleId!}
                  categories={categories ?? []}
                  defaultExpanded={true}
                />
              ))}
          <CostSummaryFooter items={allItems} settings={settings} />
        </>
      )}

      {vehicleId && (
        <IntervalItemFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          vehicleId={vehicleId}
        />
      )}
    </div>
  )
}

function TrackerSection({
  label,
  dotColor,
  isOverdue,
  count,
  items,
  currentMileage,
  vehicleId,
  categories,
  defaultExpanded,
}: {
  label: string
  dotColor: string
  isOverdue: boolean
  count: number
  items: IntervalItem[]
  currentMileage: number
  vehicleId: string
  categories: ServiceCategory[]
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 py-2 group cursor-pointer"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${dotColor} ${isOverdue ? 'animate-pulse-dot' : ''}`}
        />
        <span className="text-[0.8rem] font-bold uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs text-text-muted font-medium">({count})</span>
        <div className="flex-1" />
        <span
          className={`text-text-muted transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mt-1">
          {items.map((item, i) => (
            <TrackerItemCard
              key={item.id}
              item={item}
              currentMileage={currentMileage}
              vehicleId={vehicleId}
              categories={categories}
              delay={i * 0.04}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TrackerItemCard({
  item,
  currentMileage,
  vehicleId,
  categories,
  delay,
}: {
  item: IntervalItem
  currentMileage: number
  vehicleId: string
  categories: ServiceCategory[]
  delay: number
}) {
  const [servicedOpen, setServicedOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const status = (item.status ?? 'ad_hoc') as IntervalStatus

  const categoryName = useMemo(() => {
    if (!item.category_id) return ''
    return categories.find((c) => c.id === item.category_id)?.name ?? ''
  }, [item.category_id, categories])

  const lastDate = item.last_service_date
    ? new Date(item.last_service_date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const costStr = item.estimated_cost != null && item.estimated_cost > 0
    ? formatCurrency(item.estimated_cost)
    : item.estimated_cost === 0
      ? 'Free'
      : ''

  const { progressPercent, progressLabel, nextLabel } = useMemo(() => {
    if (item.type === 'ad_hoc' || !item.next_service_miles || !item.last_service_miles) {
      return { progressPercent: null, progressLabel: '', nextLabel: '' }
    }
    const totalInterval = item.next_service_miles - item.last_service_miles
    const used = currentMileage - item.last_service_miles
    const pct = Math.min(Math.max((used / totalInterval) * 100, 0), 100)
    const remaining = item.miles_remaining ?? (item.next_service_miles - currentMileage)
    const label = remaining < 0
      ? `${formatMileage(Math.abs(remaining))} mi over`
      : `${formatMileage(remaining)} mi left`
    const next = `Next: ${formatMileage(item.next_service_miles)} mi`
    return { progressPercent: pct, progressLabel: label, nextLabel: next }
  }, [item, currentMileage])

  const statusColorClass =
    status === 'overdue'
      ? 'text-status-overdue'
      : status === 'due_soon'
        ? 'text-status-due-soon'
        : status === 'ok'
          ? 'text-status-ok'
          : 'text-text-muted'

  const fillColorClass =
    status === 'overdue'
      ? 'bg-status-overdue'
      : status === 'due_soon'
        ? 'bg-status-due-soon'
        : status === 'ok'
          ? 'bg-status-ok'
          : 'bg-status-adhoc'

  return (
    <>
      <div
        className="bg-bg-card border border-border-default rounded-[14px] px-4 py-3.5 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border-default))] animate-card-in cursor-pointer"
        style={{ animationDelay: `${delay}s` }}
        onClick={() => setServicedOpen(true)}
      >
        {/* Top row: name + badge */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="font-semibold text-[0.88rem] flex-1 min-w-0 truncate">{item.name}</span>
          <div className="shrink-0">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-muted mb-1.5">
          {categoryName && (
            <span className="flex items-center gap-1">
              <Tag className="w-[13px] h-[13px]" />
              {categoryName}
            </span>
          )}
          {lastDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-[13px] h-[13px]" />
              Last: {lastDate}
            </span>
          )}
          {item.last_service_miles != null && (
            <span className="flex items-center gap-1">
              <Gauge className="w-[13px] h-[13px]" />
              {formatMileage(item.last_service_miles)} mi
            </span>
          )}
          {costStr && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-[13px] h-[13px]" />
              {costStr}
            </span>
          )}
        </div>

        {/* Progress */}
        {progressPercent !== null && (
          <div className="mt-1">
            <div className="flex justify-between text-[0.7rem] mb-0.5">
              <span className="text-text-muted">{nextLabel}</span>
              <span className={`font-mono font-medium ${statusColorClass}`}>
                {progressLabel}
              </span>
            </div>
            <div className="h-1.5 bg-progress-track rounded-full overflow-visible relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${fillColorClass}`}
                style={{ width: `${Math.max(progressPercent, 0)}%` }}
              />
              {status === 'overdue' && (
                <div className="absolute right-0 -top-1 -bottom-1 w-0.5 bg-text-muted rounded-sm" />
              )}
            </div>
          </div>
        )}
      </div>

      <MarkServicedModal
        open={servicedOpen}
        onClose={() => setServicedOpen(false)}
        item={item}
        currentMileage={currentMileage}
        vehicleId={vehicleId}
      />
      <IntervalItemFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        vehicleId={vehicleId}
        initialData={item}
      />
    </>
  )
}

function MarkServicedModal({
  open,
  onClose,
  item,
  currentMileage,
  vehicleId,
}: {
  open: boolean
  onClose: () => void
  item: IntervalItem
  currentMileage: number
  vehicleId: string
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!)
  const [odometer, setOdometer] = useState(String(currentMileage))
  const [shopName, setShopName] = useState('')
  const mutation = useMarkServiced()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]!)
      setOdometer(String(currentMileage))
      setShopName('')
    }
  }, [open, currentMileage])

  const odometerNum = parseInt(odometer, 10)
  const isValid = !isNaN(odometerNum) && odometerNum > 0 && date.length > 0
  const nextDue =
    item.recommended_interval_miles && isValid
      ? odometerNum + item.recommended_interval_miles
      : null

  function handleSubmit() {
    if (!isValid) return
    mutation.mutate(
      {
        vehicleId,
        itemId: item.id,
        data: {
          service_date: date,
          odometer: odometerNum,
          facility: shopName.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast(`${item.name} marked as serviced`)
          onClose()
        },
        onError: () => toast('Failed to update', 'error'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={`Service: ${item.name}`}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary block mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Service Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">
            Odometer
          </label>
          <input
            type="number"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            className="w-full px-3 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">
            <MapPin className="w-3.5 h-3.5 inline mr-1" />
            Shop
          </label>
          <ShopAutocomplete
            value={null}
            onChange={(_id, name) => setShopName(name)}
            vehicleId={vehicleId}
          />
        </div>
        {nextDue && (
          <div className="text-sm text-text-secondary bg-bg-elevated rounded-lg px-3 py-2">
            Next due at{' '}
            <span className="font-mono font-medium text-text-primary">
              {formatMileage(nextDue)} mi
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || mutation.isPending}
            className="flex-1 py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CostSummaryFooter({
  items,
  settings,
}: {
  items: IntervalItem[]
  settings?: { shop_fee: number; tax_rate: number } | undefined
}) {
  const actionable = items.filter(
    (i) => i.status === 'overdue' || i.status === 'due_soon',
  )
  const subtotal = actionable.reduce(
    (sum, i) => sum + (i.estimated_cost ?? 0),
    0,
  )
  if (subtotal === 0) return null

  const shopFee = settings?.shop_fee ?? 40
  const taxRate = settings?.tax_rate ?? 0.07
  const tax = (subtotal + shopFee) * taxRate
  const total = subtotal + shopFee + tax

  return (
    <Card className="mt-2">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Estimated Costs
        </span>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">
            Services ({actionable.length})
          </span>
          <span className="font-mono">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Shop Fee</span>
          <span className="font-mono">{formatCurrency(shopFee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Tax</span>
          <span className="font-mono">{formatCurrency(tax)}</span>
        </div>
        <div className="border-t border-border-subtle my-2" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="font-mono text-accent">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </Card>
  )
}
