import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = "Couldn't load data",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-10 h-10 text-status-overdue mb-3" />
      <h3 className="text-base font-medium text-text-primary mb-1">
        {message}
      </h3>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-accent-subtle text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  )
}
