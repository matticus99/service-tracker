import type { IntervalStatus } from '@/types/api'

const FILL_COLORS: Record<IntervalStatus, string> = {
  overdue: 'bg-status-overdue',
  due_soon: 'bg-status-due-soon',
  ok: 'bg-status-ok',
  ad_hoc: 'bg-status-adhoc',
}

interface ProgressBarProps {
  percent: number
  status: IntervalStatus
  showMarker?: boolean
}

export function ProgressBar({ percent, status, showMarker }: ProgressBarProps) {
  const capped = Math.min(percent, 115)

  return (
    <div className="h-1.5 bg-progress-track rounded-full overflow-visible relative">
      <div
        className={`h-full rounded-full transition-all duration-500 ${FILL_COLORS[status]}`}
        style={{ width: `${Math.max(capped, 0)}%` }}
      />
      {showMarker && (
        <div className="absolute right-0 -top-1 -bottom-1 w-0.5 bg-text-muted rounded-sm" />
      )}
    </div>
  )
}
