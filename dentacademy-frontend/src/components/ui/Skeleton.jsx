export function Skeleton({ className = '', ...props }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} {...props} />;
}

export function SkeletonRow({ cols = 6 }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 flex-1"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="card-surface divide-y divide-line overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-3 bg-surface-muted/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[8rem]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`card-surface p-6 ${className}`}>
      <Skeleton className="h-4 w-24 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 mb-2"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-surface p-5 flex items-start gap-4">
          <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonStatGrid />
      <SkeletonTable />
    </div>
  );
}
