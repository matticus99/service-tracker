interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-bg-elevated rounded-[10px] animate-skeleton ${className}`}
    />
  )
}

export function CardSkeleton() {
  return <Skeleton className="h-32 w-full" />
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: cards }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
