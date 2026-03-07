import type { IntervalStatus } from '@/types/api'
import { statusLabel } from '@/lib/format'

const BADGE_STYLES: Record<IntervalStatus, string> = {
  overdue: 'bg-status-overdue-subtle text-status-overdue',
  due_soon: 'bg-status-due-soon-subtle text-status-due-soon',
  ok: 'bg-status-ok-subtle text-status-ok',
  ad_hoc: 'bg-status-adhoc-subtle text-status-adhoc',
}

interface StatusBadgeProps {
  status: IntervalStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[status]} ${className}`}
    >
      {statusLabel(status)}
    </span>
  )
}

interface TypeBadgeProps {
  type: 'regular' | 'ad_hoc'
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
      {type === 'regular' ? 'Regular' : 'Ad-Hoc'}
    </span>
  )
}
