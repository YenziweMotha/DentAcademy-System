export function SkeletonRow({ cols = 6 }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="h-4 flex-1 rounded bg-slate-200/70 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="h-4 w-24 rounded bg-slate-200/70 animate-pulse mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-slate-100 animate-pulse mb-2"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
