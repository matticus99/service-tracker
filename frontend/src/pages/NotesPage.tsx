import { useState } from 'react'
import {
  CheckCircle,
  Circle,
  Inbox,
} from 'lucide-react'
import { useObservations, useToggleObservationResolved } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { Card } from '@/components/ui/Card'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatMileage } from '@/lib/format'

type Filter = 'all' | 'unresolved' | 'resolved'

export function NotesPage() {
  const { vehicleId } = useVehicle()
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

  if (isLoading) return <PageSkeleton cards={3} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex gap-1 mb-4 bg-bg-card rounded-full p-1 max-w-xs">
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

      {!observations || observations.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-10 h-10" />}
          title="No observations"
          description="Observations about your vehicle will appear here"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {observations.map((obs, i) => (
            <Card key={obs.id} delay={i * 0.04}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
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
    </div>
  )
}
