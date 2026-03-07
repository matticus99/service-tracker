import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronRight,
  Droplets,
  DollarSign,
  TrendingUp,
  Car,
  Plus,
  CheckCircle,
  RotateCcw,
} from 'lucide-react'
import { useDashboard, useUpdateMileage, useSettings } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatMileage, formatCurrency, formatDate } from '@/lib/format'
import { AddServiceRecordModal } from '@/components/forms/AddServiceRecordModal'
import { AddObservationModal } from '@/components/forms/AddObservationModal'
import type { Dashboard } from '@/types/api'

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
      <QuickActions />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <AttentionCard data={data} />
        <OilChangeCard data={data} />
        <CostSummaryCard data={data} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <StatsCard data={data} />
        <VehicleHeroCard data={data} />
      </div>
    </div>
  )
}

function QuickActions() {
  const { vehicleId, vehicle } = useVehicle()
  const [serviceOpen, setServiceOpen] = useState(false)
  const [observationOpen, setObservationOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-2 gap-2 max-w-[400px]">
        <button
          onClick={() => setServiceOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-subtle text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Service Record
        </button>
        <button
          onClick={() => setObservationOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-subtle text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Observation
        </button>
      </div>
      {vehicleId && (
        <>
          <AddServiceRecordModal
            open={serviceOpen}
            onClose={() => setServiceOpen(false)}
            vehicleId={vehicleId}
            currentMileage={vehicle?.current_mileage ?? 0}
          />
          <AddObservationModal
            open={observationOpen}
            onClose={() => setObservationOpen(false)}
            vehicleId={vehicleId}
            currentMileage={vehicle?.current_mileage ?? 0}
          />
        </>
      )}
    </>
  )
}

function AttentionCard({ data }: { data: Dashboard }) {
  const navigate = useNavigate()
  const overdueCount = data.overdue_items.length
  const dueSoonCount = data.due_soon_items.length

  if (overdueCount === 0 && dueSoonCount === 0) {
    return (
      <Card delay={0.06} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-status-ok-subtle flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-status-ok" />
        </div>
        <div>
          <div className="font-semibold text-status-ok">All Up to Date</div>
          <div className="text-xs text-text-secondary">
            No services need attention
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card delay={0.06}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-status-overdue" />
        <span className="text-xs font-bold uppercase tracking-wider text-status-overdue">
          Needs Attention
        </span>
      </div>
      {overdueCount > 0 && (
        <button
          onClick={() => navigate('/tracker?status=overdue')}
          className="w-full flex items-center gap-3 py-2.5 px-3 -mx-3 hover:bg-bg-card-hover rounded-lg transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-status-overdue animate-pulse-dot" />
          <div className="flex-1 text-left">
            <span className="text-sm font-medium">{overdueCount} Overdue</span>
            <div className="text-xs text-text-secondary truncate">
              {data.overdue_items.map((i) => i.name).join(', ')}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </button>
      )}
      {dueSoonCount > 0 && (
        <button
          onClick={() => navigate('/tracker?status=due_soon')}
          className="w-full flex items-center gap-3 py-2.5 px-3 -mx-3 hover:bg-bg-card-hover rounded-lg transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-status-due-soon" />
          <div className="flex-1 text-left">
            <span className="text-sm font-medium">
              {dueSoonCount} Due Soon
            </span>
            <div className="text-xs text-text-secondary truncate">
              {data.due_soon_items.map((i) => i.name).join(', ')}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </Card>
  )
}

function OilChangeCard({ data }: { data: Dashboard }) {
  const oc = data.next_oil_change

  return (
    <Card delay={0.12}>
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Next Oil Change
        </span>
      </div>
      {oc.due_at_miles ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-text-secondary">Due at</span>
            <span className="text-sm font-mono font-semibold">
              {formatMileage(oc.due_at_miles)} mi
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-text-secondary">Remaining</span>
            <span
              className={`text-sm font-mono font-semibold ${
                oc.miles_remaining !== null && oc.miles_remaining <= 0
                  ? 'text-status-overdue'
                  : 'text-status-ok'
              }`}
            >
              {oc.miles_remaining !== null
                ? `${formatMileage(Math.abs(oc.miles_remaining))} mi${oc.miles_remaining < 0 ? ' over' : ''}`
                : '—'}
            </span>
          </div>
          {oc.estimated_weeks !== null && oc.estimated_weeks > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Estimated</span>
              <span className="text-sm text-text-secondary">
                ~{Math.round(oc.estimated_weeks)} weeks
              </span>
            </div>
          )}
          {oc.last_date && (
            <div className="pt-2 border-t border-border-subtle text-xs text-text-muted">
              Last: {formatDate(oc.last_date)}
              {oc.last_facility && ` at ${oc.last_facility}`}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-text-muted">No oil change data yet</div>
      )}
    </Card>
  )
}

function CostSummaryCard({ data }: { data: Dashboard }) {
  const cs = data.cost_summary
  const { data: settings } = useSettings()
  const [shopFeeOverride, setShopFeeOverride] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasItems = cs.overdue_count > 0 || cs.due_soon_count > 0
  const effectiveFee = hasItems ? (shopFeeOverride ?? cs.shop_fee) : 0
  const taxRate = settings?.tax_rate ?? 0.07
  const tax = hasItems ? (cs.subtotal + effectiveFee) * taxRate : 0
  const total = hasItems ? cs.subtotal + effectiveFee + tax : 0

  function handleEditBlur() {
    setEditing(false)
    const val = inputRef.current?.value
    if (val === undefined || val === '') return
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 0) {
      setShopFeeOverride(num)
    }
  }

  return (
    <Card delay={0.18}>
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Upcoming Costs
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">
            Overdue ({cs.overdue_count})
          </span>
          <span className="font-mono">{formatCurrency(cs.overdue_total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">
            Due Soon ({cs.due_soon_count})
          </span>
          <span className="font-mono">
            {formatCurrency(cs.due_soon_total)}
          </span>
        </div>
        <div className="border-t border-border-subtle border-dashed my-2" />
        <div className="flex justify-between items-center text-sm">
          <span className="text-text-secondary flex items-center gap-1">
            Shop Fee
            {shopFeeOverride !== null && (
              <button
                onClick={() => setShopFeeOverride(null)}
                title="Reset to default"
                className="text-text-muted hover:text-accent transition-colors p-0.5"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </span>
          {!hasItems ? (
            <span className="font-mono text-text-muted">—</span>
          ) : editing ? (
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="0.01"
              defaultValue={effectiveFee.toFixed(2)}
              onBlur={handleEditBlur}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()}
              autoFocus
              className="w-20 px-1.5 py-0.5 bg-bg-input border border-border-default rounded text-right font-mono text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="font-mono hover:text-accent transition-colors cursor-pointer"
              title="Click to edit"
            >
              {formatCurrency(effectiveFee)}
            </button>
          )}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Tax</span>
          <span className="font-mono">
            {hasItems ? formatCurrency(tax) : <span className="text-text-muted">—</span>}
          </span>
        </div>
        <div className="border-t border-border-subtle my-2" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="font-mono text-accent">
            {hasItems ? formatCurrency(total) : <span className="text-text-muted font-normal">—</span>}
          </span>
        </div>
      </div>
    </Card>
  )
}

function StatsCard({ data }: { data: Dashboard }) {
  const ms = data.mileage_stats

  return (
    <Card delay={0.24}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Mileage Averages
        </span>
      </div>
      {ms.data_points >= 2 ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-mono font-bold">
                {Math.round(ms.daily)}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted">
                mi/day
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-mono font-bold">
                {Math.round(ms.weekly)}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted">
                mi/week
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-mono font-bold">
                {formatMileage(Math.round(ms.monthly))}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted">
                mi/month
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-text-muted text-center">
            Based on {ms.data_points} oil changes
          </div>
        </>
      ) : (
        <div className="text-sm text-text-muted">
          Need at least 2 oil changes to calculate averages
        </div>
      )}
    </Card>
  )
}

function VehicleHeroCard({ data }: { data: Dashboard }) {
  const [mileageOpen, setMileageOpen] = useState(false)
  const v = data.vehicle

  return (
    <Card delay={0.3}>
      <div className="flex items-center gap-2 mb-3">
        <Car className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Vehicle Info
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl bg-bg-elevated flex items-center justify-center shrink-0">
          <Car className="w-8 h-8 text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg">
            {v.year} {v.make} {v.model}
          </div>
          {v.trim && (
            <div className="text-sm text-text-secondary">{v.trim}</div>
          )}
          {v.color && (
            <div className="text-xs text-text-muted">{v.color}</div>
          )}
          <div className="mt-2 font-mono text-2xl font-bold">
            {formatMileage(v.current_mileage)}{' '}
            <span className="text-sm text-text-muted font-sans">mi</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => setMileageOpen(true)}
        className="mt-3 w-full py-2.5 bg-accent-subtle text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium"
      >
        Update Mileage
      </button>
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
