import type { IntervalStatus } from '@/types/api'
import { statusLabel } from '@/lib/format'

const BADGE_STYLES: Record<IntervalStatus, string> = {
  overdue: 'bg-status-overdue-subtle text-status-overdue border border-status-overdue-border',
  due_soon: 'bg-status-due-soon-subtle text-status-due-soon border border-status-due-soon-border',
  ok: 'bg-status-ok-subtle text-status-ok border border-status-ok-border',
  ad_hoc: 'bg-status-adhoc-subtle text-status-adhoc border border-status-adhoc-border',
}

interface StatusBadgeProps {
  status: IntervalStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider ${BADGE_STYLES[status]} ${className}`}
    >
      {statusLabel(status)}
    </span>
  )
}

interface CategoryBadgeProps {
  name: string
  className?: string
}

export function CategoryBadge({ name, className = '' }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-accent-subtle text-accent border border-accent/30 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider ${className}`}
    >
      {name}
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
