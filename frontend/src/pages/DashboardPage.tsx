import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Clock,
  DollarSign,
  TrendingUp,
  Truck,
  Plus,
  Edit3,
} from 'lucide-react'
import { useDashboard, useUpdateMileage, useCategories } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatMileage, formatCurrency, formatDate } from '@/lib/format'
import { AddServiceRecordModal } from '@/components/forms/AddServiceRecordModal'
import type { Dashboard, IntervalItem, IntervalStatus } from '@/types/api'
import { Car } from 'lucide-react'

export function DashboardPage() {
  const { vehicleId, isLoading: vehiclesLoading } = useVehicle()
  const { data, isLoading, error, refetch } = useDashboard(vehicleId)

  if (vehiclesLoading || isLoading) return <PageSkeleton cards={5} />
  if (!vehicleId) {
    return (
      <EmptyState
        icon={<Car className="w-10 h-10" />}
        title="No vehicles yet"
        description="Add a vehicle via the API to get started"
      />
    )
  }
  if (error || !data) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="p-4 flex flex-col gap-3 max-w-6xl mx-auto">
      <VehicleHeroCard data={data} />
      <QuickActions />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <UpcomingCard data={data} />
        <AttentionCard data={data} />
        <CostSummaryCard data={data} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MileageCard data={data} />
      </div>
    </div>
  )
}

function VehicleHeroCard({ data }: { data: Dashboard }) {
  const v = data.vehicle

  return (
    <div className="relative flex items-center gap-4 p-4 lg:p-5 bg-gradient-to-b from-bg-elevated to-bg-card rounded-[14px] border border-border-default overflow-hidden animate-card-in">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent via-purple-400 to-accent" />
      <div className="w-24 h-24 lg:w-[110px] lg:h-[110px] rounded-[10px] bg-bg-body border border-border-default shrink-0 flex flex-col items-center justify-center cursor-pointer">
        <Truck className="w-10 h-10 text-text-muted" />
        <span className="text-[0.55rem] text-text-muted mt-1 uppercase font-semibold">Photo</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-secondary font-medium">
          {v.year} {v.make}
        </div>
        <div className="text-xl font-extrabold tracking-tight">
          {v.model}{v.trim ? ` ${v.trim}` : ''}
        </div>
        <div className="font-mono text-[1.7rem] lg:text-[2rem] font-semibold text-accent tracking-tight leading-tight">
          {formatMileage(v.current_mileage)}
        </div>
        <div className="text-[0.7rem] text-text-muted font-medium">miles</div>
      </div>
    </div>
  )
}

function QuickActions() {
  const { vehicleId, vehicle } = useVehicle()
  const [serviceOpen, setServiceOpen] = useState(false)

  return (
    <>
      <div className="max-w-[400px] animate-card-in" style={{ animationDelay: '0.05s' }}>
        <button
          onClick={() => setServiceOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-[10px] font-semibold text-sm hover:bg-accent-hover active:scale-[0.97] transition-all"
        >
          <Plus className="w-[18px] h-[18px]" />
          Add Service Record
        </button>
      </div>
      {vehicleId && (
        <AddServiceRecordModal
          open={serviceOpen}
          onClose={() => setServiceOpen(false)}
          vehicleId={vehicleId}
          currentMileage={vehicle?.current_mileage ?? 0}
        />
      )}
    </>
  )
}

function UpcomingCard({ data }: { data: Dashboard }) {
  const navigate = useNavigate()
  const { data: categories } = useCategories()

  const upcomingItems = useMemo(() => {
    const items: IntervalItem[] = [
      ...data.overdue_items,
      ...data.due_soon_items,
    ]
    return items.slice(0, 3)
  }, [data.overdue_items, data.due_soon_items])

  const totalCost = useMemo(() => {
    return [...data.overdue_items, ...data.due_soon_items].reduce(
      (sum, item) => sum + (item.estimated_cost ?? 0),
      0,
    )
  }, [data.overdue_items, data.due_soon_items])

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId || !categories) return ''
    for (const cat of categories) {
      if (cat.id === categoryId) return cat.name
    }
    return ''
  }

  const getItemStatus = (item: IntervalItem): IntervalStatus => {
    return (item.status ?? 'ok') as IntervalStatus
  }

  const getProgressPercent = (item: IntervalItem): number => {
    if (!item.next_service_miles || !item.last_service_miles) return 0
    const total = item.next_service_miles - item.last_service_miles
    if (total <= 0) return 100
    const current = (data.vehicle.current_mileage ?? 0) - item.last_service_miles
    return Math.min(Math.max((current / total) * 100, 0), 100)
  }

  const getMilesLabel = (item: IntervalItem): { text: string; status: IntervalStatus } => {
    const remaining = item.miles_remaining ?? 0
    const status = getItemStatus(item)
    if (remaining < 0) {
      return { text: `${formatMileage(Math.abs(remaining))} mi over`, status }
    }
    return { text: `${formatMileage(remaining)} mi left`, status }
  }

  if (upcomingItems.length === 0) {
    return (
      <Card delay={0.1}>
        <div className="flex items-center justify-between mb-3.5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
            <Clock className="w-4 h-4" /> Upcoming
          </span>
        </div>
        <div className="text-sm text-text-muted">No upcoming services</div>
      </Card>
    )
  }

  return (
    <Card delay={0.1}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
          <Clock className="w-4 h-4" /> Upcoming{' '}
          <span className="text-text-muted font-medium text-[0.8rem] normal-case">
            ({formatCurrency(totalCost)})
          </span>
        </span>
        <button
          onClick={() => navigate('/tracker')}
          className="text-[0.7rem] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          View all &rarr;
        </button>
      </div>
      <div>
        {upcomingItems.map((item, i) => {
          const milesLabel = getMilesLabel(item)
          const status = getItemStatus(item)
          const statusColorClass =
            status === 'overdue'
              ? 'text-status-overdue'
              : status === 'due_soon'
                ? 'text-status-due-soon'
                : 'text-status-ok'
          const dotColorClass =
            status === 'overdue'
              ? 'bg-status-overdue shadow-[0_0_6px_rgba(240,68,68,0.5)]'
              : status === 'due_soon'
                ? 'bg-status-due-soon'
                : 'bg-status-ok'

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 py-2.5 cursor-pointer ${i < upcomingItems.length - 1 ? 'border-b border-border-subtle' : ''} ${i === 0 ? '' : ''}`}
              onClick={() => navigate('/tracker')}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColorClass}`} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {item.name}{' '}
                  <span className="text-text-muted font-normal ml-1.5">
                    ({formatCurrency(item.estimated_cost ?? 0)})
                  </span>
                </div>
                <div className="text-[0.7rem] text-text-muted mt-0.5">
                  {getCategoryName(item.category_id)}
                </div>
              </div>
              <div>
                <div className={`font-mono text-xs font-medium text-right whitespace-nowrap ${statusColorClass}`}>
                  {milesLabel.text}
                </div>
                <div className="w-full mt-1">
                  <div className="h-1 bg-progress-track rounded-full overflow-visible relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        status === 'overdue'
                          ? 'bg-status-overdue'
                          : status === 'due_soon'
                            ? 'bg-status-due-soon'
                            : 'bg-status-ok'
                      }`}
                      style={{ width: `${Math.max(getProgressPercent(item), 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function AttentionCard({ data }: { data: Dashboard }) {
  const navigate = useNavigate()
  const overdueCount = data.overdue_items.length
  const dueSoonCount = data.due_soon_items.length

  if (overdueCount === 0 && dueSoonCount === 0) {
    return (
      <Card delay={0.15}>
        <div className="flex items-center gap-2 mb-3.5">
          <AlertTriangle className="w-4 h-4 text-text-secondary" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Needs Attention
          </span>
        </div>
        <div className="text-sm text-text-muted">All services up to date</div>
      </Card>
    )
  }

  return (
    <Card delay={0.15}>
      <div className="flex items-center gap-2 mb-3.5">
        <AlertTriangle className="w-4 h-4 text-text-secondary" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Needs Attention
        </span>
      </div>
      {overdueCount > 0 && (
        <div
          onClick={() => navigate('/tracker')}
          className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-bg-card-hover -mx-2 px-2 rounded-md transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-status-overdue-subtle text-status-overdue flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1 text-sm">
            <strong className="font-semibold">{overdueCount} overdue</strong>{' '}
            service{overdueCount !== 1 ? 's' : ''}
          </div>
          <div className="text-text-muted">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
      {dueSoonCount > 0 && (
        <div
          onClick={() => navigate('/tracker')}
          className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-bg-card-hover -mx-2 px-2 rounded-md transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-status-due-soon-subtle text-status-due-soon flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1 text-sm">
            <strong className="font-semibold">{dueSoonCount} due soon</strong>{' '}
            service{dueSoonCount !== 1 ? 's' : ''}
          </div>
          <div className="text-text-muted">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </Card>
  )
}

function CostSummaryCard({ data }: { data: Dashboard }) {
  const cs = data.cost_summary

  return (
    <Card delay={0.2}>
      <div className="flex items-center gap-2 mb-3.5">
        <DollarSign className="w-4 h-4 text-text-secondary" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Upcoming Costs
        </span>
      </div>
      <div>
        <div className="flex justify-between py-2 text-[0.9rem]">
          <span>Overdue ({cs.overdue_count})</span>
          <span className="font-mono text-sm font-medium">{formatCurrency(cs.overdue_total)}</span>
        </div>
        <div className="flex justify-between py-2 text-[0.9rem]">
          <span>Due Soon ({cs.due_soon_count})</span>
          <span className="font-mono text-sm font-medium">{formatCurrency(cs.due_soon_total)}</span>
        </div>
        <div className="border-t border-dashed border-border-default my-1" />
        <div className="flex justify-between py-2 text-[0.9rem]">
          <span className="text-text-muted">Shop Fee</span>
          <span className="font-mono text-sm font-medium text-text-muted">&mdash;</span>
        </div>
        <div className="flex justify-between py-2 text-[0.9rem]">
          <span className="text-text-muted">Tax</span>
          <span className="font-mono text-sm font-medium text-text-muted">&mdash;</span>
        </div>
        <div className="flex justify-between pt-2.5 mt-0.5 border-t border-dashed border-border-default">
          <span className="font-extrabold text-base">Total</span>
          <span className="font-mono text-[0.95rem] font-bold">
            {formatCurrency(cs.overdue_total + cs.due_soon_total)}
          </span>
        </div>
      </div>
    </Card>
  )
}

function MileageCard({ data }: { data: Dashboard }) {
  const [mileageOpen, setMileageOpen] = useState(false)
  const v = data.vehicle
  const ms = data.mileage_stats

  return (
    <Card delay={0.25}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
          <TrendingUp className="w-4 h-4" /> Mileage
        </span>
        <button
          onClick={() => setMileageOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-bg-card-hover transition-colors"
        >
          <Edit3 className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="font-mono text-xl font-bold">{formatMileage(v.current_mileage)}</span>
        <span className="text-xs text-text-secondary">current</span>
      </div>
      {ms.data_points >= 2 && (
        <div className="flex items-baseline gap-2 mb-2.5">
          <span className="font-mono text-base font-bold">~{formatMileage(Math.round(ms.monthly))}</span>
          <span className="text-xs text-text-secondary">mi / month avg</span>
        </div>
      )}
      <div className="text-[0.7rem] text-text-muted mt-0.5">
        Last updated: {formatDate(v.created_at)}
      </div>
      <UpdateMileageModal
        open={mileageOpen}
        onClose={() => setMileageOpen(false)}
        currentMileage={v.current_mileage}
        vehicleId={v.id}
      />
    </Card>
  )
}

function UpdateMileageModal({
  open,
  onClose,
  currentMileage,
  vehicleId,
}: {
  open: boolean
  onClose: () => void
  currentMileage: number
  vehicleId: string
}) {
  const [value, setValue] = useState('')
  const mutation = useUpdateMileage()
  const { toast } = useToast()

  const mileage = parseInt(value, 10)
  const isValid = !isNaN(mileage) && mileage > 0

  function handleSubmit() {
    if (!isValid) return
    mutation.mutate(
      { vehicleId, mileage },
      {
        onSuccess: () => {
          toast('Mileage updated')
          onClose()
          setValue('')
        },
        onError: () => toast('Failed to update mileage', 'error'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Mileage">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary block mb-1">
            Current: {formatMileage(currentMileage)} mi
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter new mileage"
            className="w-full px-3 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent transition-colors"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {isValid && mileage < currentMileage && (
            <p className="text-xs text-status-due-soon mt-1">
              This is less than the current mileage
            </p>
          )}
        </div>
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
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
