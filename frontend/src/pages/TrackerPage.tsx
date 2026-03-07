import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Gauge,
  Calendar,
  DollarSign,
} from 'lucide-react'
import {
  useIntervalItems,
  useSettings,
  useMarkServiced,
} from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { StatusCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TypeBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatMileage, formatCurrency, formatDate } from '@/lib/format'
import type { IntervalItem, IntervalStatus } from '@/types/api'

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

export function TrackerPage() {
  const { vehicleId, vehicle } = useVehicle()
  const { data: items, isLoading, error, refetch } = useIntervalItems(vehicleId)
  const { data: settings } = useSettings()
  const [searchParams] = useSearchParams()
  const highlightStatus = searchParams.get('status')

  const grouped = useMemo(() => {
    if (!items) return new Map<IntervalStatus, IntervalItem[]>()
    const groups = new Map<IntervalStatus, IntervalItem[]>()
    for (const status of STATUS_ORDER) {
      groups.set(status, [])
    }
    for (const item of items) {
      const s = (item.status ?? 'ad_hoc') as IntervalStatus
      groups.get(s)?.push(item)
    }
    return groups
  }, [items])

  if (isLoading) return <PageSkeleton cards={4} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  const allItems = items ?? []

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-3">
      {allItems.length === 0 ? (
        <EmptyState
          icon={<Gauge className="w-10 h-10" />}
          title="No interval items"
          description="Add maintenance items to track their service intervals"
        />
      ) : (
        <>
          {STATUS_ORDER.map((status) => {
            const sectionItems = grouped.get(status) ?? []
            if (sectionItems.length === 0) return null
            return (
              <TrackerSection
                key={status}
                status={status}
                items={sectionItems}
                currentMileage={vehicle?.current_mileage ?? 0}
                vehicleId={vehicleId!}
                defaultExpanded={
                  status === 'overdue' ||
                  status === 'due_soon' ||
                  highlightStatus === status
                }
              />
            )
          })}
          <CostSummaryFooter items={allItems} settings={settings} />
        </>
      )}
    </div>
  )
}

function TrackerSection({
  status,
  items,
  currentMileage,
  vehicleId,
  defaultExpanded,
}: {
  status: IntervalStatus
  items: IntervalItem[]
  currentMileage: number
  vehicleId: string
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-2 group"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[status]} ${status === 'overdue' ? 'animate-pulse-dot' : ''}`}
        />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          {STATUS_LABELS[status]} ({items.length})
        </span>
        <div className="flex-1" />
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-1">
          {items.map((item, i) => (
            <TrackerItemCard
              key={item.id}
              item={item}
              status={status}
              currentMileage={currentMileage}
              vehicleId={vehicleId}
              delay={i * 0.04}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrackerItemCard({
  item,
  status,
  currentMileage,
  vehicleId,
  delay,
}: {
  item: IntervalItem
  status: IntervalStatus
  currentMileage: number
  vehicleId: string
  delay: number
}) {
  const [servicedOpen, setServicedOpen] = useState(false)

  const percent = calcPercent(item, currentMileage)

  return (
    <>
      <StatusCard status={status} delay={delay}>
        <div className="flex justify-between items-start mb-1">
          <div className="font-medium text-sm">{item.name}</div>
          {item.estimated_cost != null && (
            <span className="text-xs font-mono text-text-secondary">
              {formatCurrency(item.estimated_cost)}
            </span>
          )}
        </div>
        <TypeBadge type={item.type} />

        <div className="mt-2.5 space-y-1 text-xs text-text-secondary">
          {item.last_service_date && (
            <div className="flex justify-between">
              <span>Last service</span>
              <span>
                {formatDate(item.last_service_date)}
                {item.last_service_miles != null &&
                  ` · ${formatMileage(item.last_service_miles)} mi`}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Next due</span>
            <span className="font-mono">
              {item.next_service_miles != null
                ? `${formatMileage(item.next_service_miles)} mi`
                : item.target_miles != null
                  ? `${formatMileage(item.target_miles)} mi`
                  : 'As Needed'}
            </span>
          </div>
        </div>

        {percent !== null && (
          <div className="mt-2.5">
            <ProgressBar percent={percent} status={status} />
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-text-muted">
                {percent > 100 ? `${percent - 100}% over` : `${percent}%`}
              </span>
              {item.miles_remaining != null && (
                <span
                  className={`font-mono ${
                    item.miles_remaining <= 0
                      ? 'text-status-overdue'
                      : 'text-text-secondary'
                  }`}
                >
                  {item.miles_remaining <= 0
                    ? `${formatMileage(Math.abs(item.miles_remaining))} mi over`
                    : `${formatMileage(item.miles_remaining)} mi left`}
                </span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setServicedOpen(true)}
          className="mt-3 w-full py-2 bg-accent-subtle text-accent rounded-lg hover:bg-accent/20 transition-colors text-xs font-medium"
        >
          Mark as Serviced
        </button>
      </StatusCard>

      <MarkServicedModal
        open={servicedOpen}
        onClose={() => setServicedOpen(false)}
        item={item}
        currentMileage={currentMileage}
        vehicleId={vehicleId}
      />
    </>
  )
}

function calcPercent(item: IntervalItem, currentMileage: number): number | null {
  if (item.type === 'ad_hoc' && !item.target_miles) return null
  const interval =
    item.recommended_interval_miles ??
    (item.target_miles && item.last_service_miles
      ? item.target_miles - item.last_service_miles
      : null)
  if (!interval || !item.last_service_miles) return null
  const used = currentMileage - item.last_service_miles
  return Math.round((used / interval) * 100)
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
  const mutation = useMarkServiced()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]!)
      setOdometer(String(currentMileage))
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
        data: { service_date: date, odometer: odometerNum },
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
