export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse-soft rounded-xl bg-brick-edge/50 ${className}`}
    />
  );
}

export function DayCardSkeleton() {
  return (
    <div className="rounded-2xl border border-brick-edge bg-brick p-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-3 w-24" />
      <div className="mt-4 grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    </div>
  );
}
