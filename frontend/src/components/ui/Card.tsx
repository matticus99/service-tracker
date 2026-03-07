import type { ReactNode } from 'react'
import type { IntervalStatus } from '@/types/api'

interface CardProps {
  children: ReactNode
  className?: string
  delay?: number
  onClick?: () => void
}

export function Card({ children, className = '', delay, onClick }: CardProps) {
  return (
    <div
      className={`bg-bg-card border border-border-default rounded-[10px] p-4 ${onClick ? 'cursor-pointer hover:bg-bg-card-hover hover:border-border-default transition-all duration-200' : ''} ${delay !== undefined ? 'animate-card-in' : ''} ${className}`}
      style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

const STATUS_BORDER_COLORS: Record<IntervalStatus, string> = {
  overdue: 'border-l-status-overdue',
  due_soon: 'border-l-status-due-soon',
  ok: 'border-l-status-ok',
  ad_hoc: 'border-l-status-adhoc',
}

interface StatusCardProps extends CardProps {
  status: IntervalStatus
}

export function StatusCard({
  status,
  children,
  className = '',
  delay,
  onClick,
}: StatusCardProps) {
  return (
    <Card
      className={`border-l-[3.5px] ${STATUS_BORDER_COLORS[status]} ${className}`}
      delay={delay}
      onClick={onClick}
    >
      {children}
    </Card>
  )
}
