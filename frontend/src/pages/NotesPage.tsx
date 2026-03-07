import { useState } from 'react'
import {
  CheckCircle,
  Circle,
  Inbox,
  Plus,
} from 'lucide-react'
import { useObservations, useToggleObservationResolved } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttachmentSection } from '@/components/attachments/AttachmentSection'
import { AddObservationModal } from '@/components/forms/AddObservationModal'
import { formatDate, formatDateLong, formatMileage } from '@/lib/format'
import type { Observation } from '@/types/api'

type Filter = 'all' | 'unresolved' | 'resolved'

export function NotesPage() {
  const { vehicleId, vehicle } = useVehicle()
  const [filter, setFilter] = useState<Filter>('all')
  const resolvedParam =
    filter === 'all' ? undefined : filter === 'resolved' ? true : false
  const {
    data: observations,
    isLoading,
    error,
    refetch,
  } = useObservations(vehicleId, resolvedParam)
  const toggleMutation = useToggleObservationResolved()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null)

  if (isLoading) return <PageSkeleton cards={3} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 bg-bg-card rounded-full p-1 max-w-xs flex-1">
          {(['all', 'unresolved', 'resolved'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-accent-subtle text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="p-2 text-accent hover:bg-accent-subtle rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {!observations || observations.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-10 h-10" />}
          title="No observations"
          description="Observations about your vehicle will appear here"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {observations.map((obs, i) => (
            <Card
              key={obs.id}
              delay={i * 0.04}
              onClick={() => setSelectedObs(obs)}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMutation.mutate(
                      {
                        vehicleId: vehicleId!,
                        obsId: obs.id,
                        resolved: !obs.resolved,
                      },
                      {
                        onSuccess: () =>
                          toast(
                            obs.resolved
                              ? 'Marked as unresolved'
                              : 'Marked as resolved',
                          ),
                        onError: () => toast('Failed to update', 'error'),
                      },
                    )
                  }}
                  className="mt-0.5 shrink-0"
                >
                  {obs.resolved ? (
                    <CheckCircle className="w-5 h-5 text-status-ok" />
                  ) : (
                    <Circle className="w-5 h-5 text-text-muted hover:text-text-secondary transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${obs.resolved ? 'text-text-secondary line-through' : ''}`}
                  >
                    {obs.observation}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                    <span>{formatDate(obs.observation_date)}</span>
                    {obs.odometer != null && (
                      <span className="font-mono">
                        {formatMileage(obs.odometer)} mi
                      </span>
                    )}
                    {obs.resolved && obs.resolved_date && (
                      <span className="text-status-ok">
                        Resolved {formatDate(obs.resolved_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {vehicleId && (
        <AddObservationModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          vehicleId={vehicleId}
          currentMileage={vehicle?.current_mileage ?? 0}
        />
      )}

      {selectedObs && vehicleId && (
        <Modal
          open={true}
          onClose={() => setSelectedObs(null)}
          title="Observation"
        >
          <div className="space-y-3">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider">
                Date
              </div>
              <div className="text-sm">
                {formatDateLong(selectedObs.observation_date)}
              </div>
            </div>
            {selectedObs.odometer != null && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider">
                  Odometer
                </div>
                <div className="text-sm font-mono">
                  {formatMileage(selectedObs.odometer)} mi
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider">
                Observation
              </div>
              <div className="text-sm text-text-secondary">
                {selectedObs.observation}
              </div>
            </div>
            {selectedObs.resolved && selectedObs.resolved_date && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider">
                  Resolved
                </div>
                <div className="text-sm text-status-ok">
                  {formatDateLong(selectedObs.resolved_date)}
                </div>
              </div>
            )}
          </div>
          <AttachmentSection
            vehicleId={vehicleId}
            recordType="observation"
            recordId={selectedObs.id}
          />
        </Modal>
      )}
    </div>
  )
}
